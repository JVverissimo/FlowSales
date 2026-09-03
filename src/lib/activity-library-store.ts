import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Activity, ActivityType, SocialNetwork, ActivityShift } from "./mock-data";

type Library = Record<ActivityType, Activity[]>;

const empty: Library = { research: [], social: [], email: [], call: [] };

type Row = {
  id: string;
  type: string;
  name: string;
  instructions: string | null;
  preferred_network: string | null;
  shift: string | null;
};

const fromDb = (r: Row): Activity => ({
  id: r.id,
  type: r.type as ActivityType,
  name: r.name,
  instructions: r.instructions ?? undefined,
  preferredNetwork: (r.preferred_network as SocialNetwork | null) ?? undefined,
  shift: (r.shift as ActivityShift | null) ?? undefined,
});

export function useActivityLibrary() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<Library>(empty);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_library")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.error("fetch library", error); return; }
    const next: Library = { research: [], social: [], email: [], call: [] };
    (data as Row[]).forEach(r => {
      const a = fromDb(r);
      if (next[a.type]) next[a.type].push(a);
    });
    setLibrary(next);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`activity-library-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_library" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const save = async (a: Activity, previousType?: ActivityType) => {
    const payload = {
      type: a.type,
      name: a.name,
      instructions: a.instructions ?? null,
      preferred_network: a.preferredNetwork ?? null,
      shift: a.shift ?? null,
    };
    if (previousType) {
      const { error } = await supabase
        .from("activity_library")
        .update(payload)
        .eq("id", a.id);
      if (error) { console.error("update activity", error); throw error; }
    } else {
      const { error } = await supabase
        .from("activity_library")
        .insert({ ...payload, created_by: user?.id ?? null });
      if (error) { console.error("insert activity", error); throw error; }
    }
    await fetchAll();
  };

  const duplicate = async (a: Activity) => {
    const { error } = await supabase.from("activity_library").insert({
      type: a.type,
      name: `${a.name} (cópia)`,
      instructions: a.instructions ?? null,
      preferred_network: a.preferredNetwork ?? null,
      shift: a.shift ?? null,
      created_by: user?.id ?? null,
    });
    if (error) { console.error("duplicate activity", error); throw error; }
    await fetchAll();
  };

  const remove = async (a: Activity) => {
    const { error } = await supabase.from("activity_library").delete().eq("id", a.id);
    if (error) { console.error("remove activity", error); throw error; }
    await fetchAll();
  };

  return { library, save, duplicate, remove };
}
