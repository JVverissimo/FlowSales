// Centralized mock data for FlowSales — cleaned state (no seed data)
export type Priority = "very_high" | "high" | "normal" | "low";
export type CadenceFocus = "inbound_active" | "inbound_passive" | "outbound" | "other";
export type ActivityType = "research" | "social" | "email" | "call";
export type LeadStatus = "active" | "won" | "lost" | "archived";

export interface SDR {
  id: string;
  name: string;
  initials: string;
  color: string;
  online: boolean;
}

// Single current user so the app still has an identity for the logged-in SDR.
export const sdrs: SDR[] = [
  { id: "u1", name: "Você", initials: "EU", color: "hsl(142 71% 45%)", online: true },
];

export type SocialNetwork = "linkedin" | "facebook" | "twitter" | "instagram" | "whatsapp" | "other";

export type ActivityShift = "immediate" | "morning" | "afternoon" | "evening";

export interface Activity {
  id: string;
  type: ActivityType;
  name: string;
  instructions?: string;
  preferredNetwork?: SocialNetwork;
  shift?: ActivityShift;
}

export interface CadenceDay {
  day: number;
  activities: Activity[];
}

export type PhaseWonAction = "advance" | "schedule" | "attendance" | "finish";

export interface CadencePhase {
  id: string;
  name: string;
  cadenceId: string;
  wonAction?: PhaseWonAction;
}

export interface Cadence {
  id: string;
  name: string;
  description?: string;
  priority: Priority;
  focus: CadenceFocus;
  participants: string[];
  total: number;
  waiting: number;
  inProgress: number;
  finished: number;
  won: number;
  wonRate: number;
  status: "active" | "archived";
  days: CadenceDay[];
  phases: CadencePhase[];
  inactivityDays?: number;
  lossReason?: string;
  channel?: string | null;
  defaultShift?: ActivityShift | null;
  linkedToCrm?: boolean;
}

export const activityLibrary: Record<ActivityType, Activity[]> = {
  research: [],
  social: [],
  email: [],
  call: [],
};

export const cadences: Cadence[] = [];

// Leads
export interface Lead {
  id: string; name: string; company: string; email: string; phone: string;
  status: LeadStatus; cadenceId: string | null; ownerId: string;
  phaseIndex?: number;
  city?: string; state?: string; website?: string;
  fonte?: string | null;
  segmento?: string | null;
  faturamento?: string | null;
  dataEntrada?: string | null;
  origemImportacao?: string | null;
  cargo?: string | null;
  lossReason?: string | null;
  companyTarget?: string | null;
  channel?: string | null;
  notes?: string | null;
}
export const leads: Lead[] = [];

// Dashboard data — all zeroed
export const opportunitiesGoal = 0;
export const opportunitiesNow = 0;

export const opportunitiesProgress = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  meta: 0,
  real: null as number | null,
}));

export const sdrLeadsRanking: { sdr: SDR; prospecting: number; finished: number }[] = [];
export const sdrActivitiesRanking: { sdr: SDR; total: number; dailyAvg: number; pending: number }[] = [];
export const sdrConversionRanking: { sdr: SDR; opps: number; rate: number }[] = [];

export const lossReasons: { reason: string; pct: number }[] = [];
export const conversionByOrigin: { origin: string; won: number; lost: number }[] = [];
export const responseTime: { sdr: SDR; approached: number; withinHour: number }[] = [];

// Daily execution queue for current SDR
export interface ExecutionItem {
  id: string; activity: Activity; lead: Lead; cadenceName: string; day: number; step: number;
}

export const todayQueue: ExecutionItem[] = [];
