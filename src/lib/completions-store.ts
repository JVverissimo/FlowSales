import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type Completion = {
  id: string;
  leadId: string;
  cadenceId: string | null;
  dayNumber: number;
  activityIndex: number;
  phaseIndex: number;
  activityType: string;
  activityName: string | null;
  status: "done" | "skipped";
  notes: string | null;
  completedAt: string;
};

type DbRow = {
  id: string;
  lead_id: string;
  cadence_id: string | null;
  day_number: number;
  activity_index: number;
  phase_index: number | null;
  activity_type: string;
  activity_name: string | null;
  status: string;
  notes: string | null;
  completed_at: string;
};

const fromDb = (r: DbRow): Completion => ({
  id: r.id,
  leadId: r.lead_id,
  cadenceId: r.cadence_id,
  dayNumber: r.day_number,
  activityIndex: r.activity_index,
  phaseIndex: r.phase_index ?? 0,
  activityType: r.activity_type,
  activityName: r.activity_name,
  status: (r.status as Completion["status"]) ?? "done",
  notes: r.notes,
  completedAt: r.completed_at,
});

export function activityKey(c: { leadId: string; cadenceId: string | null; phaseIndex?: number; dayNumber: number; activityIndex: number }) {
  return `${c.leadId}|${c.cadenceId ?? "none"}|${c.phaseIndex ?? 0}|${c.dayNumber}|${c.activityIndex}`;
}

export function useCompletions() {
  const { user } = useAuth();
  const [completions, setCompletions] = useState<Completion[]>([]);

  const fetchAll = useCallback(async () => {
    if (!user?.id) { setCompletions([]); return; }
    const { data, error } = await supabase
      .from("activity_completions")
      .select("*")
      .order("completed_at", { ascending: false });
    if (error) { console.error("fetch completions", error); return; }
    setCompletions((data as DbRow[]).map(fromDb));
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`completions-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_completions" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const add = async (input: {
    leadId: string;
    cadenceId: string | null;
    phaseIndex?: number;
    dayNumber: number;
    activityIndex: number;
    activityType: string;
    activityName?: string;
    status: "done" | "skipped";
    notes?: string;
  }) => {
    if (!user?.id) return;
    const { error } = await supabase.from("activity_completions").insert({
      lead_id: input.leadId,
      cadence_id: input.cadenceId,
      day_number: input.dayNumber,
      activity_index: input.activityIndex,
      phase_index: input.phaseIndex ?? 0,
      activity_type: input.activityType,
      activity_name: input.activityName ?? null,
      status: input.status,
      notes: input.notes ?? null,
      user_id: user.id,
    });
    if (error) { console.error("add completion", error); throw error; }
    await fetchAll();
  };

  return { completions, add, refetch: fetchAll };
}
