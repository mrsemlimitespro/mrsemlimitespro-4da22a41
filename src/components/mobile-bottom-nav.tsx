import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wrench, ShoppingBag, LayoutGrid, User } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type TabItem = {
  id: string;
  title: string;
  to: string;
  icon: IconType;
  matches: string[];
};

/**
 * Bottom Navigation mobile-first — exatamente 5 abas, sem scroll horizontal.
 * Cada aba agrupa múltiplas rotas via `matches[]`; toda navegação existente
 * é preservada — só muda como o usuário chega até ela no mobile.
 */
const items: TabItem[] = [
  { id: "home", title: "Início", to: "/", icon: Home, matches: ["/"] },
  {
    id: "ferramentas",
    title: "Ferramentas",
    to: "/ferramentas",
    icon: Wrench,
    matches: ["/ferramentas", "/agents", "/packs", "/prompts", "/baixar-extensao"],
  },
  {
    id: "loja",
    title: "Loja",
    to: "/loja",
    icon: ShoppingBag,
    matches: ["/loja", "/creditos", "/dashboard", "/checkout"],
  },
  {
    id: "gestao",
    title: "Gestão",
    to: "/gestao",
    icon: LayoutGrid,
    matches: ["/gestao", "/clientes", "/licencas", "/admin/revendedores-gestao", "/revendedor"],
  },
  {
    id: "perfil",
    title: "Perfil",
    to: "/perfil",
    icon: User,
    matches: ["/perfil", "/minha-conta", "/aulas"],
  },
];

function matchTab(pathname: string, tab: TabItem): boolean {
  if (tab.id === "home") return pathname === "/";
  return tab.matches.some((p) => p === pathname || pathname.startsWith(`${p}/`));
}

export function MobileBottomNav() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-border/60 bg-surface/85 backdrop-blur-2xl",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        boxShadow: "0 -1px 0 0 oklch(1 0 0 / 4%), 0 -12px 40px -12px oklch(0 0 0 / 55%)",
      }}
    >
      <ul className="mx-auto flex w-full max-w-[640px] items-stretch justify-around px-1">
        {items.map((item) => {
          const active = matchTab(currentPath, item);
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <Link
                to={item.to}
                onClick={() => playSfx("swipe")}
                aria-label={item.title}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative mx-auto flex h-14 min-h-14 w-full min-w-12 flex-col items-center justify-center gap-0.5",
                  "outline-none transition-colors",
                  "active:scale-[0.94] transition-transform duration-100",
                  active ? "text-primary-foreground" : "text-foreground/60 hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full transition-all duration-200",
                    active ? "gradient-primary opacity-100" : "bg-transparent opacity-0",
                  )}
                  style={
                    active
                      ? {
                          boxShadow:
                            "0 0 12px -2px color-mix(in oklab, var(--primary) 85%, transparent)",
                        }
                      : undefined
                  }
                />
                <Icon
                  className={cn(
                    "size-[22px] transition-transform duration-200",
                    active && "scale-110",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={cn(
                    "text-[10.5px] font-medium leading-none tracking-tight",
                    active && "font-semibold",
                  )}
                >
                  {item.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
