import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityShift, Cadence, CadenceDay, CadenceFocus, CadencePhase, Priority } from "./mock-data";

type DbCadence = {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  focus: string;
  status: string;
  inactivity_days: number | null;
  loss_reason: string | null;
  participants: string[] | null;
  days: CadenceDay[] | null;
  phases: CadencePhase[] | null;
  channel: string | null;
  default_shift: string | null;
  linked_to_crm: boolean | null;
};

function fromDb(r: DbCadence): Cadence {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    priority: (r.priority as Priority) ?? "normal",
    focus: (r.focus as CadenceFocus) ?? "outbound",
    participants: r.participants ?? [],
    total: 0, waiting: 0, inProgress: 0, finished: 0, won: 0, wonRate: 0,
    status: (r.status as Cadence["status"]) ?? "active",
    days: r.days ?? [],
    phases: r.phases ?? [],
    inactivityDays: r.inactivity_days ?? undefined,
    lossReason: r.loss_reason ?? undefined,
    channel: r.channel ?? null,
    defaultShift: (r.default_shift as ActivityShift | null) ?? null,
    linkedToCrm: r.linked_to_crm ?? true,
  };
}

export interface NewCadenceInput {
  name: string;
  description?: string;
  priority: Priority;
  focus: CadenceFocus;
  inactivityDays?: number;
  lossReason?: string;
  channel?: string | null;
  defaultShift?: ActivityShift | null;
}

export function useCadences() {
  const [cadences, setCadences] = useState<Cadence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from("cadences")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error("fetch cadences", error); setLoading(false); return; }
    setCadences((data as unknown as DbCadence[]).map(fromDb));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`cadences-changes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cadences" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    cadences,
    loading,
    add: async (input: NewCadenceInput): Promise<Cadence | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("cadences") as any).insert({
        name: input.name,
        description: input.description ?? null,
        priority: input.priority,
        focus: input.focus,
        inactivity_days: input.inactivityDays ?? null,
        loss_reason: input.lossReason ?? null,
        channel: input.channel ?? null,
        default_shift: input.defaultShift ?? null,
        participants: [],
        days: [],
      }).select().single();
      if (error) { console.error("add cadence", error); throw error; }
      await fetchAll();
      return data ? fromDb(data as unknown as DbCadence) : null;
    },
    update: async (id: string, patch: Partial<Cadence>) => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.description !== undefined) dbPatch.description = patch.description ?? null;
      if (patch.priority !== undefined) dbPatch.priority = patch.priority;
      if (patch.focus !== undefined) dbPatch.focus = patch.focus;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.inactivityDays !== undefined) dbPatch.inactivity_days = patch.inactivityDays ?? null;
      if (patch.lossReason !== undefined) dbPatch.loss_reason = patch.lossReason ?? null;
      if (patch.participants !== undefined) dbPatch.participants = patch.participants;
      if (patch.days !== undefined) dbPatch.days = patch.days;
      if (patch.phases !== undefined) dbPatch.phases = patch.phases;
      if (patch.channel !== undefined) dbPatch.channel = patch.channel ?? null;
      if (patch.defaultShift !== undefined) dbPatch.default_shift = patch.defaultShift ?? null;
      if (patch.linkedToCrm !== undefined) dbPatch.linked_to_crm = patch.linkedToCrm;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("cadences") as any).update(dbPatch).eq("id", id);
      if (error) { console.error("update cadence", error); throw error; }
      await fetchAll();
    },
    remove: async (id: string) => {
      const { error } = await supabase.from("cadences").delete().eq("id", id);
      if (error) { console.error("remove cadence", error); throw error; }
      await fetchAll();
    },
    duplicate: async (id: string) => {
      const orig = cadences.find(c => c.id === id);
      if (!orig) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("cadences") as any).insert({
        name: `${orig.name} (cópia)`,
        description: orig.description ?? null,
        priority: orig.priority,
        focus: orig.focus,
        status: orig.status,
        inactivity_days: orig.inactivityDays ?? null,
        loss_reason: orig.lossReason ?? null,
        participants: orig.participants,
        days: orig.days,
      });
      if (error) { console.error("duplicate cadence", error); throw error; }
      await fetchAll();
    },
  };
}
