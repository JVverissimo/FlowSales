import { ActivityType } from "@/lib/mock-data";
import { Phone, Mail, Search } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";

const config: Record<ActivityType, { bg: string; icon: React.ComponentType<{ className?: string }>; label: string; bar: string }> = {
  call:     { bg: "bg-primary text-primary-foreground",       icon: Phone,        label: "Ligação",     bar: "bg-primary" },
  email:    { bg: "bg-info text-info-foreground",             icon: Mail,         label: "E-mail",      bar: "bg-info" },
  social:   { bg: "bg-[hsl(142_70%_45%)] text-white",         icon: FaWhatsapp,   label: "WhatsApp",    bar: "bg-[hsl(142_70%_45%)]" },
  research: { bg: "bg-muted-foreground/70 text-background",   icon: Search,       label: "Pesquisa",    bar: "bg-muted-foreground/70" },
};

export function ActivityIcon({ type, size = "md", className }: { type: ActivityType; size?: "sm" | "md" | "lg"; className?: string }) {
  const c = config[type];
  const Icon = c.icon;
  const sizes = {
    sm: "h-6 w-6 [&>svg]:h-3.5 [&>svg]:w-3.5",
    md: "h-9 w-9 [&>svg]:h-4 [&>svg]:w-4",
    lg: "h-12 w-12 [&>svg]:h-5 [&>svg]:w-5",
  };
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full shrink-0", c.bg, sizes[size], className)}>
      <Icon />
    </span>
  );
}

export function activityLabel(type: ActivityType) { return config[type].label; }
export function activityBar(type: ActivityType) { return config[type].bar; }
