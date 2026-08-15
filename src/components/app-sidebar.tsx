import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  Users,
  Users2,
  Megaphone,
  ListOrdered,
  FileCode,
  Webhook,
  Zap,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsAuthed } from "@/hooks/useIsAuthed";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  title: string;
  url: string;
  icon: IconType;
};

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Workspaces", url: "/empresas", icon: Building2 },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageSquare },
  { title: "Contatos", url: "/contatos", icon: Users },
  { title: "Grupos", url: "/grupos", icon: Users2 },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Filas", url: "/filas", icon: ListOrdered },
  { title: "Logs", url: "/logs", icon: FileCode },
  { title: "Webhooks", url: "/webhooks", icon: Webhook },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const authed = useIsAuthed();

  if (authed !== true) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <aside className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:flex flex-col items-center gap-1 rounded-[2.5rem] px-2 py-4 border border-border/70 bg-surface/40 backdrop-blur-2xl w-[76px] hover:w-[84px] group/sidebar transition-all shadow-glow">
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <RailButton key={item.title} item={item} active={currentPath.startsWith(item.url)} />
          ))}
          <RailAction title="Sair" icon={LogOut} variant="danger" onClick={() => supabase.auth.signOut()} />
        </nav>
      </aside>
    </TooltipProvider>
  );
}

function RailButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.url}
          className={cn(
            "group relative grid size-11 place-items-center rounded-full transition-all duration-200",
            "text-foreground/60 hover:text-foreground",
            active && "text-primary-foreground",
          )}
        >
          {active && <span className="absolute inset-0 rounded-full gradient-primary shadow-glow" />}
          <Icon className="relative z-10 size-[18px]" strokeWidth={2} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}

function RailAction({ title, icon: Icon, variant, onClick }: { title: string; icon: IconType; variant?: "danger"; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "grid size-11 place-items-center rounded-full transition-all duration-200",
            "text-foreground/55 hover:text-foreground hover:bg-white/5",
            variant === "danger" && "hover:text-destructive hover:bg-destructive/10",
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}
