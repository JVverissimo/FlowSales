export type Company = "neurochat" | "neuro-analytics" | "residi" | "impl-residi";

export const COMPANIES: { value: Company; label: string; color: string }[] = [
  { value: "neurochat", label: "Neurochat", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { value: "neuro-analytics", label: "Neuro Analytics", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  { value: "residi", label: "Residi", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  { value: "impl-residi", label: "Impl Residi", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
];

export const companyLabel = (v: string) => COMPANIES.find(c => c.value === v)?.label ?? v;
export const companyColor = (v: string) => COMPANIES.find(c => c.value === v)?.color ?? "bg-muted text-muted-foreground border-border";

export type Channel =
  | "inbound_anuncio" | "inbound_bio_insta" | "inbound_neurochat_indica" | "inbound_palestra_eventos" | "inbound_site"
  | "prospeccao_whatsapp" | "recuperacao_base"
  | "networking_sdr"
  | "outbound_cold_call";

export type ChannelGroup = "inbound" | "prospeccao_ativa" | "networking" | "outbound";

export const CHANNEL_GROUPS: { group: ChannelGroup; label: string; channels: { value: Channel; label: string }[] }[] = [
  {
    group: "inbound", label: "Inbound", channels: [
      { value: "inbound_anuncio", label: "Anúncio" },
      { value: "inbound_bio_insta", label: "Bio Insta" },
      { value: "inbound_neurochat_indica", label: "NeuroChat Indica" },
      { value: "inbound_palestra_eventos", label: "Palestra / Eventos" },
      { value: "inbound_site", label: "Site" },
    ],
  },
  {
    group: "prospeccao_ativa", label: "Prospecção Ativa", channels: [
      { value: "prospeccao_whatsapp", label: "WhatsApp" },
      { value: "recuperacao_base", label: "Recuperação de Base" },
    ],
  },
  { group: "networking", label: "Networking", channels: [{ value: "networking_sdr", label: "Networking SDR" }] },
  { group: "outbound", label: "Outbound", channels: [{ value: "outbound_cold_call", label: "Cold Call" }] },
];

export const channelLabel = (v: string) => {
  for (const g of CHANNEL_GROUPS) {
    const c = g.channels.find(x => x.value === v);
    if (c) return c.label;
  }
  return v;
};

export const channelGroupOf = (v: string): ChannelGroup | null => {
  for (const g of CHANNEL_GROUPS) if (g.channels.some(c => c.value === v)) return g.group;
  return null;
};

export const groupLabel = (g: ChannelGroup) => CHANNEL_GROUPS.find(x => x.group === g)?.label ?? g;

export const MEETING_RESPONSIBLES = [
  { value: "rafael@neuroanalytics.com.br", label: "Rafael" },
  { value: "carlos@neuroanalytics.com.br", label: "Carlos" },
];

export const BONUS_THRESHOLD = 7;

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
    [a && `(${a}`, a.length === 2 && ") ", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export interface Meeting {
  id: string;
  sdr_id: string;
  company: Company;
  client_company: string;
  responsible_name: string;
  phone: string;
  scheduled_at: string;
  meeting_responsible: string;
  channel: Channel;
  status: "pending" | "occurred" | "no-show";
  closed: boolean;
  closed_at: string | null;
}

export interface ChannelCommissionConfig {
  id: string;
  channel: string;
  company: string;
  meeting_value: number;
  closing_value: number;
  bonus_value: number;
  bonus_threshold: number;
}
