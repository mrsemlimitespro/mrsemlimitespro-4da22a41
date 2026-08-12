import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  Bot,
  MessageSquare,
  Package,
  ShoppingBag,
  KeyRound,
  Users,
  GraduationCap,
  Coins,
  User,
  ChevronRight,
  Download,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: IconType;
  matches?: string[];
};

/**
 * Menu flutuante horizontal — mobile / PWA / app nativo.
 * Rola livremente com snap, indicador "há mais itens →" e safe-area.
 * Usa apenas rotas reais do app para evitar links quebrados.
 */
const items: NavItem[] = [
  { id: "home", label: "Home", to: "/", icon: Home },
  { id: "agents", label: "Agents", to: "/agents", icon: Bot },
  { id: "packs", label: "Packs", to: "/packs", icon: Package },
  { id: "extensao", label: "Extensão", to: "/baixar-extensao", icon: Download },
  { id: "prompts", label: "Prompts", to: "/prompts", icon: MessageSquare },
  { id: "loja", label: "Loja", to: "/creditos", icon: ShoppingBag },
  { id: "licencas", label: "Licenças", to: "/licencas", icon: KeyRound },
  { id: "clientes", label: "Clientes", to: "/clientes", icon: Users },
  { id: "aulas", label: "Aulas", to: "/aulas", icon: GraduationCap },
  { id: "creditos", label: "Créditos", to: "/creditos", icon: Coins, matches: ["/creditos"] },
  { id: "perfil", label: "Perfil", to: "/perfil", icon: User },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.to === "/") return pathname === "/";
  const paths = [item.to, ...(item.matches ?? [])];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function MobileFloatingNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasMoreRight, setHasMoreRight] = useState(true);
  const [hasMoreLeft, setHasMoreLeft] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setHasMoreLeft(el.scrollLeft > 4);
      setHasMoreRight(el.scrollLeft < max - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Centraliza o item ativo ao trocar de rota
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeBtn) return;
    const target =
      activeBtn.offsetLeft - el.clientWidth / 2 + activeBtn.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [pathname]);

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        paddingLeft: "calc(env(safe-area-inset-left) + 0.5rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 0.5rem)",
      }}
    >
      <nav
        aria-label="Navegação principal"
        className={cn(
          "pointer-events-auto relative mx-auto flex max-w-[720px] items-center gap-1",
          "rounded-full border border-white/10 bg-black/40 px-1.5 py-1.5",
          "backdrop-blur-2xl",
        )}
        style={{
          boxShadow:
            "0 0 0 1px color-mix(in oklab, var(--brand-magenta, oklch(0.68 0.28 340)) 35%, transparent), 0 10px 40px -10px color-mix(in oklab, var(--primary) 55%, transparent), 0 20px 60px -20px oklch(0 0 0 / 75%)",
        }}
      >
        {/* Fade esquerdo */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 z-10 w-8 rounded-l-full transition-opacity duration-200",
            hasMoreLeft ? "opacity-100" : "opacity-0",
          )}
          style={{
            background:
              "linear-gradient(to right, oklch(0 0 0 / 65%), transparent)",
          }}
        />

        <div
          ref={scrollerRef}
          className={cn(
            "flex-1 overflow-x-auto overflow-y-hidden overscroll-contain",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            "snap-x snap-mandatory scroll-smooth",
          )}
        >
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.id} className="snap-center shrink-0">
                  <Link
                    to={item.to}
                    data-active={active || undefined}
                    onClick={() => playSfx("swipe")}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={cn(
                      "relative flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium",
                      "transition-all duration-200 active:scale-[0.95]",
                      active
                        ? "text-primary-foreground"
                        : "text-foreground/70 hover:text-foreground",
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
                              "0 0 0 1px color-mix(in oklab, var(--primary) 55%, transparent), 0 0 22px -2px color-mix(in oklab, var(--brand-magenta, oklch(0.68 0.28 340)) 85%, transparent)",
                          }}
                        />
                      </>
                    )}
                    <Icon
                      className={cn(
                        "relative z-10 size-[18px] shrink-0",
                        active && "scale-110",
                      )}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    <span className="relative z-10 whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Fade + chevron direito indicando "há mais" */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-1 right-1 z-10 flex w-10 items-center justify-end rounded-r-full pr-1.5 transition-opacity duration-200",
            hasMoreRight ? "opacity-100" : "opacity-0",
          )}
          style={{
            background:
              "linear-gradient(to left, oklch(0 0 0 / 65%), transparent)",
          }}
        >
          <ChevronRight
            className="size-4 text-foreground/70 animate-[pulse_2s_ease-in-out_infinite]"
            strokeWidth={2.4}
          />
        </span>
      </nav>
    </div>
  );
}
