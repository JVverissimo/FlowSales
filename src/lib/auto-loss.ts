import { useEffect, useRef } from "react";
import { activityKey } from "./completions-store";
import type { Cadence, Lead } from "./mock-data";

/**
 * Regra: ao concluir TODAS as atividades da fase atual, o lead NUNCA avança de fase
 * automaticamente — ele é marcado como perdido e sai das listas ativas.
 */
export function useAutoLossOnPhaseComplete(
  leads: Lead[],
  cadences: Cadence[],
  completedKeys: Set<string>,
  updateLead: (id: string, patch: Partial<Lead>) => Promise<unknown>,
) {
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    leads.forEach(async (lead) => {
      if (lead.status !== "active") return;
      const base = lead.cadenceId ? cadences.find(c => c.id === lead.cadenceId) : null;
      if (!base) return;
      const pIdx = lead.phaseIndex ?? 0;
      // Se o lead já avançou de fase, ele NÃO é perdido.
      if (pIdx > 0) return;
      // Se o lead já foi movido para outra cadência (avançou de etapa no CRM), NÃO é perdido.
      const movedCadence = Array.from(completedKeys).some(k => {
        const [lid, cid] = k.split("|");
        return lid === lead.id && cid !== (lead.cadenceId ?? "none");
      });
      if (movedCadence) return;

      const hasPhases = base.phases && base.phases.length > 0;
      // Só a cadência de entrada (com fases configuradas) pode marcar perda automática.
      // Cadências de etapas seguintes (Qualificação, Comparecimento, etc.) nunca marcam perda.
      if (!hasPhases) return;
      const phaseCad = cadences.find(c => c.id === base.phases[Math.min(pIdx, base.phases.length - 1)].cadenceId) ?? base;
      if (!phaseCad) return;

      const acts = phaseCad.days.flatMap(d => d.activities.map((_, idx) => ({ day: d.day, idx })));
      if (acts.length === 0) return;
      const isDone = (a: { day: number; idx: number }) => completedKeys.has(activityKey({
        leadId: lead.id,
        cadenceId: lead.cadenceId,
        phaseIndex: pIdx,
        dayNumber: a.day,
        activityIndex: a.idx,
      }));
      // Considera a fase encerrada quando TODOS os passos foram feitos
      // OU quando os passos do ÚLTIMO dia da cadência já foram concluídos
      // (SDR pode pular dias intermediários e ainda assim chegar ao fim).
      const lastDay = Math.max(...acts.map(a => a.day));
      const lastDayActs = acts.filter(a => a.day === lastDay);
      const allDone = acts.every(isDone) || lastDayActs.every(isDone);
      if (!allDone) return;
      const guard = `${lead.id}:${pIdx}`;
      if (handled.current.has(guard)) return;
      handled.current.add(guard);
      try {
        await updateLead(lead.id, {
          status: "lost",
          lossReason: lead.lossReason ?? "Cadência concluída sem conversão",
        });
      } catch { /* ignore */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, cadences, completedKeys]);
}
