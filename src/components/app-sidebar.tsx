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
  LogIn,
  UserRound,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BRAND_NAME, BrandLogo } from "@/components/brand";
import { LogoutIncentiveDialog } from "@/components/logout-incentive-dialog";
import { useIsAuthed } from "@/hooks/useIsAuthed";
import { useUserRole } from "@/hooks/useUserRole";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  title: string;
  url: string;
  icon: IconType;
};

// Estrutura Real MR Sem Limite Pro
const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Workspaces", url: "/empresas", icon: Building2 },
];

const whatsappItems: NavItem[] = [
  { title: "WhatsApp", url: "/whatsapp", icon: MessageSquare },
  { title: "Contatos", url: "/contatos", icon: Users },
  { title: "Grupos", url: "/grupos", icon: Users2 },
];

const automationItems: NavItem[] = [
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Filas", url: "/filas", icon: ListOrdered },
];

const technicalItems: NavItem[] = [
  { title: "Logs", url: "/logs", icon: FileCode },
  { title: "Webhooks", url: "/webhooks", icon: Webhook },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

type FooterItem = NavItem | { title: string; action: "logout"; icon: IconType };

const footerItems: FooterItem[] = [
  { title: "Perfil", url: "/perfil", icon: UserRound },
  { title: "Sair", action: "logout", icon: LogOut },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const authed = useIsAuthed();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserEmail(data.user?.email ?? null);
    });
    return () => { mounted = false; };
  }, []);

  if (authed !== true) return null;

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <aside
          aria-label="Navegação principal"
          className={cn(
            "fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:flex",
            "flex-col items-center gap-1 rounded-[2.5rem] px-2 py-4",
            "border border-border/70 bg-surface/40 backdrop-blur-2xl transition-all duration-300",
            "w-[76px] hover:w-[84px] group/sidebar shadow-glow"
          )}
        >
          <div className="mb-4 flex w-full flex-col items-center px-1">
            <Link to="/" className="relative transition-transform duration-300 hover:scale-105 active:scale-95">
              <BrandLogo className="h-12 w-full" />
            </Link>
          </div>

          <div className="mb-2 h-px w-6 bg-border/70" aria-hidden />

          <nav className="flex flex-col gap-1.5">
            {[...mainItems, ...whatsappItems, ...automationItems, ...technicalItems].map((item) => (
              <RailButton key={item.title} item={item} active={isActive(item.url)} />
            ))}
          </nav>

          <div className="my-2 h-px w-6 bg-border/70" aria-hidden />

          <div className="flex flex-col gap-1.5">
            {footerItems.map((item) => (
              "url" in item ? (
                <RailButton key={item.title} item={item} active={isActive(item.url)} />
              ) : (
                <RailAction
                  key={item.title}
                  title={item.title}
                  icon={item.icon}
                  variant="danger"
                  onClick={() => setLogoutOpen(true)}
                />
              )
            ))}
          </div>
        </aside>
      </TooltipProvider>
      <LogoutIncentiveDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}

function RailButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.url}
          aria-label={item.title}
          onClick={() => playSfx("swipe")}
          className={cn(
            "group relative grid size-11 place-items-center rounded-full transition-all duration-200",
            "text-foreground/60 hover:text-foreground",
            active && "text-primary-foreground",
          )}
        >
          {active && (
            <>
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full gradient-primary" />
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-glow" />
            </>
          )}
          <Icon className="relative z-10 size-[18px]" strokeWidth={2} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>{item.title}</TooltipContent>
    </Tooltip>
  );
}

function RailAction({ title, icon: Icon, variant, onClick }: { title: string; icon: IconType; variant?: "danger"; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={title}
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
      <TooltipContent side="right" sideOffset={12}>{title}</TooltipContent>
    </Tooltip>
  );
}
