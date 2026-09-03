import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppointmentStatus = "scheduled" | "attended" | "no_show";

export type Appointment = {
  id: string;
  leadId: string;
  sdrId: string;
  cadenceId: string | null;
  scheduledAt: string;
  status: AppointmentStatus;
  sdrNotes: string | null;
  outcomeNotes: string | null;
  outcomeBy: string | null;
  outcomeAt: string | null;
  createdAt: string;
  company: string | null;
  channel: string | null;
  closed: boolean;
  closedAt: string | null;
  confirmed: boolean;
  contractValue: number | null;
  notSold: boolean;
  notSoldReason: string | null;
};

type DbRow = {
  id: string;
  lead_id: string;
  sdr_id: string;
  cadence_id: string | null;
  scheduled_at: string;
  status: string;
  sdr_notes: string | null;
  outcome_notes: string | null;
  outcome_by: string | null;
  outcome_at: string | null;
  created_at: string;
  company: string | null;
  channel: string | null;
  closed: boolean;
  closed_at: string | null;
  confirmed: boolean;
  contract_value: number | null;
  not_sold: boolean | null;
  not_sold_reason: string | null;
};

const fromDb = (r: DbRow): Appointment => ({
  id: r.id,
  leadId: r.lead_id,
  sdrId: r.sdr_id,
  cadenceId: r.cadence_id,
  scheduledAt: r.scheduled_at,
  status: (r.status as AppointmentStatus) ?? "scheduled",
  sdrNotes: r.sdr_notes,
  outcomeNotes: r.outcome_notes,
  outcomeBy: r.outcome_by,
  outcomeAt: r.outcome_at,
  createdAt: r.created_at,
  company: r.company,
  channel: r.channel,
  closed: !!r.closed,
  closedAt: r.closed_at,
  confirmed: !!r.confirmed,
  contractValue: r.contract_value !== null && r.contract_value !== undefined ? Number(r.contract_value) : null,
  notSold: !!r.not_sold,
  notSoldReason: r.not_sold_reason,
});

export function useAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("scheduled_at", { ascending: false });
    if (error) { console.error("fetch appointments", error); setLoading(false); return; }
    setAppointments((data as DbRow[]).map(fromDb));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`appointments-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const create = async (input: {
    leadId: string;
    cadenceId: string | null;
    scheduledAt: string;
    sdrNotes?: string;
    company?: string | null;
    channel?: string | null;
  }) => {
    if (!user?.id) throw new Error("not-authenticated");
    const { error } = await supabase.from("appointments").insert({
      lead_id: input.leadId,
      sdr_id: user.id,
      cadence_id: input.cadenceId,
      scheduled_at: input.scheduledAt,
      sdr_notes: input.sdrNotes ?? null,
      status: "scheduled",
      company: input.company ?? null,
      channel: input.channel ?? null,
    });
    if (error) { console.error("create appointment", error); throw error; }
    await fetchAll();
  };

  // SDR self-report — auto-confirma para liberar comissão imediatamente
  const reportOutcome = async (id: string, status: AppointmentStatus, notes?: string) => {
    if (!user?.id) throw new Error("not-authenticated");
    const patch: any = {
      status,
      sdr_notes: notes ?? undefined,
      confirmed: status === "attended",
    };
    if (status === "attended") {
      patch.outcome_by = user.id;
      patch.outcome_at = new Date().toISOString();
      if (notes) patch.outcome_notes = notes;
    }
    const { error } = await supabase.from("appointments").update(patch).eq("id", id);
    if (error) { console.error("report outcome", error); throw error; }
    await fetchAll();
  };

  // Gestor confirma (libera comissão)
  const confirmOutcome = async (id: string, status: AppointmentStatus, notes?: string) => {
    if (!user?.id) throw new Error("not-authenticated");
    const { error } = await supabase.from("appointments").update({
      status,
      outcome_notes: notes ?? null,
      outcome_by: user.id,
      outcome_at: new Date().toISOString(),
      confirmed: true,
    }).eq("id", id);
    if (error) { console.error("confirm outcome", error); throw error; }
    await fetchAll();
  };

  const markClosed = async (id: string, closed: boolean, contractValue?: number | null) => {
    const patch: any = {
      closed,
      closed_at: closed ? new Date().toISOString() : null,
      not_sold: false,
      not_sold_reason: null,
    };
    if (contractValue !== undefined) patch.contract_value = contractValue;
    const { error } = await supabase.from("appointments").update(patch).eq("id", id);
    if (error) { console.error("mark closed", error); throw error; }
    await fetchAll();
  };

  const markNotSold = async (id: string, reason: string) => {
    const { error } = await supabase.from("appointments").update({
      not_sold: true,
      not_sold_reason: reason,
      closed: false,
      closed_at: null,
      contract_value: null,
    }).eq("id", id);
    if (error) { console.error("mark not sold", error); throw error; }
    await fetchAll();
  };

  const reopenSale = async (id: string) => {
    const { error } = await supabase.from("appointments").update({
      closed: false,
      closed_at: null,
      contract_value: null,
      not_sold: false,
      not_sold_reason: null,
    }).eq("id", id);
    if (error) { console.error("reopen sale", error); throw error; }
    await fetchAll();
  };

  const updateMeta = async (id: string, patch: { company?: string | null; channel?: string | null; scheduledAt?: string; sdrNotes?: string | null }) => {
    const dbPatch: any = {};
    if (patch.company !== undefined) dbPatch.company = patch.company;
    if (patch.channel !== undefined) dbPatch.channel = patch.channel;
    if (patch.scheduledAt !== undefined) dbPatch.scheduled_at = patch.scheduledAt;
    if (patch.sdrNotes !== undefined) dbPatch.sdr_notes = patch.sdrNotes;
    const { error } = await supabase.from("appointments").update(dbPatch).eq("id", id);
    if (error) { console.error("update meta", error); throw error; }
    await fetchAll();
  };

  // Compat alias for older callers
  const setOutcome = confirmOutcome;

  const remove = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { console.error("delete appointment", error); throw error; }
    await fetchAll();
  };

  return { appointments, loading, create, setOutcome, reportOutcome, confirmOutcome, markClosed, markNotSold, reopenSale, updateMeta, remove, refetch: fetchAll };
}
