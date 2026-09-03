import { Priority, CadenceFocus, LeadStatus } from "@/lib/mock-data";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig: Record<Priority, { color: string; label: string; arrow: "up" | "down" }> = {
  very_high: { color: "text-destructive", label: "Muito alta", arrow: "up" },
  high:      { color: "text-warning",     label: "Alta",       arrow: "up" },
  normal:    { color: "text-primary",     label: "Normal",     arrow: "up" },
  low:       { color: "text-info",        label: "Baixa",      arrow: "down" },
};

export function PriorityArrow({ priority, withLabel = false }: { priority: Priority; withLabel?: boolean }) {
  const c = priorityConfig[priority];
  const Icon = c.arrow === "up" ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", c.color)}>
      <Icon className="h-4 w-4" strokeWidth={3} />
      {withLabel && <span className="text-sm">{c.label}</span>}
    </span>
  );
}

const focusConfig: Record<CadenceFocus, { label: string; className: string }> = {
  inbound_active:  { label: "Inbound ativo",   className: "bg-primary-soft text-primary border border-primary/20" },
  inbound_passive: { label: "Inbound passivo", className: "bg-info/10 text-info border border-info/20" },
  outbound:        { label: "Outbound",        className: "bg-purple/10 text-purple border border-purple/20" },
  other:           { label: "Outro",           className: "bg-muted text-muted-foreground border border-border" },
};

export function FocusBadge({ focus }: { focus: CadenceFocus }) {
  const c = focusConfig[focus];
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", c.className)}>{c.label}</span>;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  active:   { label: "ATIVO",     className: "bg-info/15 text-info" },
  won:      { label: "GANHO",     className: "bg-primary/15 text-primary" },
  lost:     { label: "PERDIDO",   className: "bg-destructive/15 text-destructive" },
  archived: { label: "ARQUIVADO", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const c = statusConfig[status];
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider", c.className)}>{c.label}</span>;
}

export function UserAvatar({ name, initials, color, size = "md", badge }: { name: string; initials: string; color: string; size?: "sm" | "md" | "lg"; badge?: number }) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  return (
    <span className="relative inline-block shrink-0">
      <span
        className={cn("inline-flex items-center justify-center rounded-full font-semibold text-white", sizes[size])}
        style={{ backgroundColor: color }}
        title={name}
      >
        {initials}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-warning-foreground text-[10px] font-bold border-2 border-background">
          {badge}
        </span>
      )}
    </span>
  );
}
