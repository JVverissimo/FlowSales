import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Radar, Phone, BarChart3, Bell, ChevronDown, LogOut, User, Building2, Plug, ListChecks, Calendar, DollarSign, KanbanSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/Badges";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface MenuItem {
  label: string; to?: string; icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; to: string }[];
}

const gestorMenu: MenuItem[] = [
  { label: "Dashboard", to: "/", icon: Home },
  {
    label: "Prospecção", icon: Radar, children: [
      { label: "Painel", to: "/prospeccao/painel" },
      { label: "Execução", to: "/prospeccao/execucao" },
      { label: "Atividades", to: "/prospeccao/atividades" },
      { label: "Cadências", to: "/prospeccao/cadencias" },
      { label: "Leads", to: "/prospeccao/leads" },
      { label: "Ajustes", to: "/prospeccao/ajustes" },
      { label: "Motivos de Perda", to: "/prospeccao/motivos-perda" },
    ],
  },
  { label: "CRM", to: "/crm", icon: KanbanSquare },
  { label: "Agendamentos", to: "/agendamentos", icon: Calendar },
  { label: "Comissões", to: "/comissoes", icon: DollarSign },
];

// SDR sees only what they can act on
const sdrMenu: MenuItem[] = [
  { label: "Dashboard", to: "/meu-dashboard", icon: Home },
  { label: "Minhas Atividades", to: "/minhas-atividades", icon: ListChecks },
  { label: "Execução", to: "/prospeccao/execucao", icon: Radar },
  { label: "CRM", to: "/crm", icon: KanbanSquare },
  { label: "Meus Leads", to: "/prospeccao/leads", icon: Phone },
  { label: "Agendamentos", to: "/agendamentos", icon: Calendar },
  { label: "Comissões", to: "/comissoes", icon: DollarSign },
];

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isGestor, signOut } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menu = isGestor ? gestorMenu : sdrMenu;

  const displayName = profile?.nome ?? "Usuário";
  const initials = displayName.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "U";
  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada");
    navigate("/auth", { replace: true });
  };

  const isActive = (to?: string, children?: { to: string }[]) => {
    if (to === "/" && location.pathname === "/") return true;
    if (to && to !== "/" && location.pathname.startsWith(to)) return true;
    if (children?.some(c => location.pathname.startsWith(c.to))) return true;
    return false;
  };


  return (
    <header className="sticky top-0 z-40 bg-nav text-nav-foreground border-b border-nav-border">
      <div className="flex items-center h-14 px-4 gap-1">
        <Link to="/" className="flex items-center gap-2 mr-4 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-primary-foreground">
            F
          </div>
          <span className="font-bold text-lg tracking-tight">FlowSales</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.children);

            if (!item.children) {
              return (
                <Link
                  key={item.label}
                  to={item.to!}
                  className={cn(
                    "flex items-center gap-2 px-3 h-14 text-sm font-medium border-b-2 transition-colors",
                    active
                      ? "text-nav-foreground border-nav-active bg-nav-hover/40"
                      : "text-nav-muted border-transparent hover:text-nav-foreground hover:bg-nav-hover/40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            }
            return (
              <DropdownMenu key={item.label} open={openMenu === item.label} onOpenChange={(o) => setOpenMenu(o ? item.label : null)}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-3 h-14 text-sm font-medium border-b-2 transition-colors outline-none",
                      active
                        ? "text-nav-foreground border-nav-active bg-nav-hover/40"
                        : "text-nav-muted border-transparent hover:text-nav-foreground hover:bg-nav-hover/40"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {item.children.map((c) => (
                    <DropdownMenuItem key={c.to} asChild>
                      <Link to={c.to} className={cn(location.pathname === c.to && "bg-accent text-accent-foreground")}>
                        {c.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button className="relative h-9 w-9 rounded-full inline-flex items-center justify-center text-nav-foreground hover:bg-nav-hover" aria-label="Notificações">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="ml-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
              <UserAvatar name={displayName} initials={initials} color="hsl(142 71% 45%)" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{isGestor ? "Gestor" : "SDR"}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/perfil"><User className="h-4 w-4 mr-2" />Meu Perfil</Link>
              </DropdownMenuItem>
              {isGestor && (
                <DropdownMenuItem asChild>
                  <Link to="/empresa"><Building2 className="h-4 w-4 mr-2" />Empresa</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/integracoes"><Plug className="h-4 w-4 mr-2" />Integrações</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
