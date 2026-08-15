import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  Users,
  UserGroupIcon,
  Megaphone,
  ListOrdered,
  FileCode,
  Webhook,
  Zap,
  Settings,
  LogOut,
  LogIn,
  Bot,
  Wand2,
  Store,
  Server,
  Download,
  UserRound,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BRAND_NAME, BrandMark, BrandLogo } from "@/components/brand";
import { LogoutIncentiveDialog } from "@/components/logout-incentive-dialog";
import { useIsAuthed } from "@/hooks/useIsAuthed";
import { useUserRole, isPrivilegedRole } from "@/hooks/useUserRole";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  title: string;
  url: string;
  icon: IconType;
};

// Público: acessível sem login
const publicItems: NavItem[] = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Catálogo", url: "/extensoes", icon: Store },
];

// Área de IA (Novo Centralizado)
const aiItems: NavItem[] = [
  { title: "Prompts IA", url: "/prompts", icon: Wand2 },
  { title: "Agentes IA", url: "/agents", icon: Bot },
];

// Cliente final: acessa seus produtos e downloads
const clienteItems: NavItem[] = [
  { title: "Minha Conta", url: "/dashboard", icon: LayoutDashboard },
  { title: "Minhas Licenças", url: "/licencas", icon: KeyRound },
  { title: "Downloads", url: "/baixar-extensao", icon: Download },
];

// Revendedor: operação comercial
const revendedorItems: NavItem[] = [
  { title: "Painel Revenda", url: "/dashboard", icon: LayoutDashboard },
  { title: "Gerar Licenças", url: "/licencas", icon: KeyRound },
  { title: "Meus Clientes", url: "/clientes", icon: Users },
  { title: "Saldo/Créditos", url: "/creditos", icon: Coins },
];

// Ultra Admin: controle total
const adminItems: NavItem[] = [
  { title: "Ultra Admin", url: "/dashboard", icon: LayoutDashboard },
  { title: "Produtos & Extensões", url: "/admin/loja-produtos", icon: Store },
  { title: "Gestão Licenças", url: "/admin/licencas", icon: KeyRound },
  { title: "Revendedores", url: "/admin/revendedores-gestao", icon: Users },
  { title: "Financeiro", url: "/admin/pagamentos", icon: Coins },
  { title: "Segurança & API", url: "/admin/api-dashboard", icon: Server },
];



type FooterItem = NavItem | { title: string; action: "logout"; icon: IconType };

const authedFooterItems: FooterItem[] = [
  { title: "Baixar Extensão", url: "/baixar-extensao", icon: Download },
  { title: "Perfil", url: "/perfil", icon: UserRound },
  { title: "Sair", action: "logout", icon: LogOut },
];

const anonFooterItems: FooterItem[] = [{ title: "Entrar", url: "/login", icon: LogIn }];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const authed = useIsAuthed();
  const role = useUserRole();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setUserEmail(s?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Antes da checagem terminar, mostramos só os itens públicos para evitar flash.
  // Cliente final não enxerga funções de revendedor (Painel/Licenças/Clientes/Créditos).
  const primaryItems: NavItem[] = (() => {
    if (authed !== true) return publicItems;
    if (role === "admin") return [...publicItems, ...adminItems, ...aiItems];
    if (isPrivilegedRole(role)) return [...publicItems, ...revendedorItems, ...aiItems];
    // cliente ou role ainda carregando
    return [...publicItems, ...clienteItems, ...aiItems];
  })();
  const footerItems: FooterItem[] = authed === true ? authedFooterItems : anonFooterItems;

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <aside
          aria-label="Navegação principal"
          className={cn(
            "fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:flex",
            "flex-col items-center gap-1 rounded-[2.5rem] px-2 py-4",
            "border border-border/70 bg-surface/40 backdrop-blur-2xl transition-all duration-300",
            "w-[76px] hover:w-[84px] group/sidebar"
          )}
          style={{
            boxShadow:
              "0 0 0 1px oklch(1 0 0 / 4%), 0 20px 60px -20px oklch(0 0 0 / 70%), 0 0 40px -6px color-mix(in oklab, var(--brand-red-neon) 25%, transparent)",
          }}
        >
          <div className="mb-4 flex w-full flex-col items-center px-1">
            <Link
              to="/"
              aria-label={`${BRAND_NAME} — ir para o dashboard`}
              className="relative transition-transform duration-300 hover:scale-105 active:scale-95"
            >
              <BrandLogo className="h-16 w-full" />
            </Link>
          </div>

          <PanelBadge authed={authed} role={role} />

          <div className="mb-1 h-px w-6 bg-border/70" aria-hidden />

          <nav className="flex flex-col gap-1.5">
            {primaryItems.map((item) => (
              <RailButton key={item.title} item={item} active={isActive(item.url)} />
            ))}
          </nav>

          <div className="my-2 h-px w-6 bg-border/70" aria-hidden />

          <div className="flex flex-col gap-1.5">
            {footerItems.map((item) => {
              if ("url" in item) {
                return <RailButton key={item.title} item={item} active={isActive(item.url)} />;
              }
              const isLogout = item.action === "logout";
              return (
                <RailAction
                  key={item.title}
                  title={item.title}
                  tooltip={
                    isLogout && userEmail ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-muted-foreground">{userEmail}</span>
                      </div>
                    ) : (
                      item.title
                    )
                  }
                  icon={item.icon}
                  variant={isLogout ? "danger" : "muted"}
                  onClick={isLogout ? () => setLogoutOpen(true) : undefined}
                />
              );
            })}
          </div>
        </aside>
      </TooltipProvider>
      <LogoutIncentiveDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}

async function downloadExtension() {
  try {
    playSfx("swipe");
    const filename = "mr-sem-limites-2.2.6.zip";
    const res = await fetch("/api/public/download-extensao", { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao baixar (${res.status})`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    toast.success("Download iniciado");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Falha ao baixar extensão");
  }
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
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full gradient-primary"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow:
                    "0 0 0 1px color-mix(in oklab, var(--primary) 60%, transparent), 0 0 24px -2px color-mix(in oklab, var(--primary) 85%, transparent)",
                }}
              />
            </>
          )}
          <Icon className="relative z-10 size-[18px]" strokeWidth={2} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {item.title}
      </TooltipContent>
    </Tooltip>
  );
}

function RailAction({
  title,
  tooltip,
  icon: Icon,
  variant = "muted",
  onClick,
}: {
  title: string;
  tooltip?: React.ReactNode;
  icon: IconType;
  variant?: "muted" | "danger";
  onClick?: () => void;
}) {
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
      <TooltipContent side="right" sideOffset={12}>
        {tooltip ?? title}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * PanelBadge — chip circular no topo do rail lateral indicando o painel atual
 * (Admin / Revendedor / Cliente / Visitante). Só visual, sem alterar rotas.
 */
function PanelBadge({
  authed,
  role,
}: {
  authed: boolean | null;
  role: ReturnType<typeof useUserRole>;
}) {
  const cfg = (() => {
    if (authed !== true) return { emoji: "🌐", label: "Visitante", glow: "oklch(0.75 0.02 260)" };
    if (role === "admin")
      return { emoji: "⭐", label: "Administrador", glow: "var(--brand-orange)" };
    if (role === "revendedor")
      return { emoji: "🏪", label: "Revendedor", glow: "var(--brand-blue)" };
    if (role === "cliente")
      return { emoji: "👤", label: "Cliente", glow: "var(--brand-emerald)" };
    return { emoji: "•", label: "Carregando…", glow: "oklch(0.6 0 0)" };
  })();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          aria-label={`Painel atual: ${cfg.label}`}
          className="mb-1 grid size-9 place-items-center rounded-full text-lg leading-none"
          style={{
            background: `color-mix(in oklab, ${cfg.glow} 25%, oklch(0 0 0 / 40%))`,
            boxShadow: `0 0 0 1px color-mix(in oklab, ${cfg.glow} 55%, transparent), 0 0 18px -2px color-mix(in oklab, ${cfg.glow} 65%, transparent)`,
          }}
        >
          <span aria-hidden>{cfg.emoji}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Painel atual
          </span>
          <span className="font-semibold">{cfg.label}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
