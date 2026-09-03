import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "./mock-data";
import { fetchBusinessHours, resolveEntryDate } from "./business-hours-store";

// Maps DB row -> app Lead type
type DbLead = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  status: string;
  cadence_id: string | null;
  owner_id: string | null;
  notes: string | null;
  role: string | null;
  fonte: string | null;
  segmento: string | null;
  faturamento: string | null;
  data_entrada: string | null;
  origem_importacao: string | null;
  phase_index: number | null;
  loss_reason: string | null;
  company_target: string | null;
  channel: string | null;
  created_at: string;
};

function fromDb(r: DbLead): Lead {
  return {
    id: r.id,
    name: r.name,
    company: r.company ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    status: (r.status as Lead["status"]) ?? "active",
    cadenceId: r.cadence_id,
    ownerId: r.owner_id ?? "",
    cargo: r.role,
    fonte: r.fonte,
    segmento: r.segmento,
    faturamento: r.faturamento,
    dataEntrada: r.data_entrada ?? r.created_at,
    origemImportacao: r.origem_importacao,
    phaseIndex: r.phase_index ?? 0,
    lossReason: r.loss_reason,
    companyTarget: r.company_target,
    channel: r.channel,
    notes: r.notes,
  };
}

export type NewLeadInput = Omit<Lead, "id" | "status"> & { status?: Lead["status"] };

const SELECT_COLS = "id,name,company,email,phone,status,cadence_id,owner_id,notes,role,fonte,segmento,faturamento,data_entrada,origem_importacao,phase_index,loss_reason,company_target,channel,created_at";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false });
    if (error) { console.error("fetch leads", error); return; }
    setLeads((data as DbLead[]).map(fromDb));
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`leads-changes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    leads,
    add: async (l: NewLeadInput) => {
      const bh = await fetchBusinessHours();
      const { data, error } = await supabase.from("leads").insert({
        name: l.name,
        company: l.company,
        email: l.email || null,
        phone: l.phone || null,
        status: l.status ?? "active",
        cadence_id: l.cadenceId,
        owner_id: l.ownerId,
        origem_importacao: "Manual",
        company_target: l.companyTarget ?? null,
        channel: l.channel ?? null,
        notes: l.notes ?? null,
        data_entrada: resolveEntryDate(new Date(), bh),
      }).select(SELECT_COLS).single();
      if (error) { console.error("add lead", error); throw error; }
      await fetchAll();
      return data ? fromDb(data as DbLead) : null;
    },
    update: async (id: string, patch: Partial<Lead>) => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.company !== undefined) dbPatch.company = patch.company;
      if (patch.email !== undefined) dbPatch.email = patch.email || null;
      if (patch.phone !== undefined) dbPatch.phone = patch.phone || null;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.cadenceId !== undefined) dbPatch.cadence_id = patch.cadenceId ?? null;
      if (patch.ownerId !== undefined) dbPatch.owner_id = patch.ownerId;
      if (patch.phaseIndex !== undefined) dbPatch.phase_index = patch.phaseIndex;
      if (patch.lossReason !== undefined) dbPatch.loss_reason = patch.lossReason ?? null;
      if (patch.companyTarget !== undefined) dbPatch.company_target = patch.companyTarget ?? null;
      if (patch.channel !== undefined) dbPatch.channel = patch.channel ?? null;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null;
      const { error } = await supabase.from("leads").update(dbPatch as never).eq("id", id);
      if (error) { console.error("update lead", error); throw error; }
      await fetchAll();
    },
    remove: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) { console.error("remove lead", error); throw error; }
      await fetchAll();
    },
  };
}
