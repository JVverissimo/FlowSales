import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessHours {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  workdays: number[]; // 0=Sun..6=Sat
}

const DEFAULT: BusinessHours = {
  startTime: "09:00",
  endTime: "18:00",
  workdays: [1, 2, 3, 4, 5],
};

const CACHE_KEY = "flowsales:business-hours-cache";

function readCache(): BusinessHours {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}

function writeCache(bh: BusinessHours) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(bh));
  window.dispatchEvent(new Event("flowsales:business-hours-updated"));
}

function timeToHHMM(t: string): string {
  // Postgres time may return "09:00:00"
  return t.slice(0, 5);
}

export async function fetchBusinessHours(): Promise<BusinessHours> {
  const { data, error } = await supabase
    .from("business_hours")
    .select("start_time,end_time,workdays")
    .limit(1)
    .maybeSingle();
  if (error || !data) return readCache();
  const bh: BusinessHours = {
    startTime: timeToHHMM(data.start_time as unknown as string),
    endTime: timeToHHMM(data.end_time as unknown as string),
    workdays: (data.workdays as number[] | null) ?? DEFAULT.workdays,
  };
  writeCache(bh);
  return bh;
}

export async function saveBusinessHours(bh: BusinessHours): Promise<void> {
  const { data: existing } = await supabase
    .from("business_hours")
    .select("id")
    .limit(1)
    .maybeSingle();
  const payload = {
    start_time: bh.startTime,
    end_time: bh.endTime,
    workdays: bh.workdays,
  };
  if (existing?.id) {
    const { error } = await supabase
      .from("business_hours")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("business_hours")
      .insert({ ...payload, singleton: true });
    if (error) throw error;
  }
  writeCache(bh);
}

/** Uses cached hours (safe for optimistic UI). For DB-authoritative use fetchBusinessHours first. */
export function resolveEntryDate(now: Date = new Date(), bh?: BusinessHours): string {
  const hours = bh ?? readCache();
  const [sh, sm] = hours.startTime.split(":").map(Number);
  const [eh, em] = hours.endTime.split(":").map(Number);
  const dow = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;

  const isWorkday = hours.workdays.includes(dow);
  const withinHours = minutes >= startM && minutes < endM;

  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (isWorkday && (withinHours || minutes < startM)) return toISODate(d);
  do {
    d.setDate(d.getDate() + 1);
  } while (!hours.workdays.includes(d.getDay()));
  return toISODate(d);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useBusinessHours() {
  const [bh, setBh] = useState<BusinessHours>(readCache);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchBusinessHours().then(v => { if (alive) { setBh(v); setLoading(false); } });
    const sync = () => setBh(readCache());
    window.addEventListener("flowsales:business-hours-updated", sync);
    const channel = supabase
      .channel(`business-hours-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "business_hours" }, () => {
        fetchBusinessHours().then(v => alive && setBh(v));
      })
      .subscribe();
    return () => {
      alive = false;
      window.removeEventListener("flowsales:business-hours-updated", sync);
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    businessHours: bh,
    loading,
    save: async (next: BusinessHours) => {
      await saveBusinessHours(next);
      setBh(next);
    },
  };
}
