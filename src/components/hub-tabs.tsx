import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import { playSfx } from "@/lib/sfx";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type HubTab = {
  label: string;
  to: string;
  icon?: IconType;
  match?: string[];
  adminOnly?: boolean;
};

interface HubTabsProps {
  tabs: HubTab[];
  className?: string;
}

/**
 * HubTabs — barra horizontal de sub-navegação usada nos hubs mobile
 * (Ferramentas, Loja, Gestão). Scroll horizontal só nas sub-abas,
 * nunca na bottom nav principal.
 */
export function HubTabs({ tabs, className }: HubTabsProps) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (t: HubTab) => {
    if (pathname === t.to) return true;
    if (t.match?.some((m) => pathname === m || pathname.startsWith(`${m}/`))) return true;
    return false;
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-3 mb-4 border-b border-border/50 bg-background/70 px-3 py-2 backdrop-blur-xl md:-mx-8 md:px-8",
        className,
      )}
    >
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = isActive(t);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              onClick={() => playSfx("swipe")}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                active
                  ? "gradient-primary text-primary-foreground shadow-lg"
                  : "border border-border/60 bg-surface/50 text-foreground/70 hover:text-foreground hover:bg-white/5",
              )}
              style={
                active
                  ? {
                      boxShadow:
                        "0 0 0 1px color-mix(in oklab, var(--primary) 55%, transparent), 0 8px 20px -8px color-mix(in oklab, var(--primary) 70%, transparent)",
                    }
                  : undefined
              }
            >
              {Icon && <Icon className="size-4" strokeWidth={2} />}
              <span className="whitespace-nowrap">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
