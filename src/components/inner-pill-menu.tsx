import { Link, useRouterState } from "@tanstack/react-router";
import { Store, MessageSquare, Bot, Package } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type PillItem = {
  label: string;
  icon: IconType;
  to: string;
};

const items: PillItem[] = [
  { label: "Loja", icon: Store, to: "/" },
  { label: "Prompts", icon: MessageSquare, to: "/prompts" },
  { label: "Agents", icon: Bot, to: "/agents" },
  { label: "Packs", icon: Package, to: "/packs" },
];

export function InnerPillMenu() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 hidden justify-center px-4 md:flex">
      <nav
        aria-label="Menu interno"
        className="pill-nav pointer-events-auto flex items-center gap-1 px-2 py-2"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "text-primary-foreground"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/5",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full gradient-primary"
                  style={{
                    boxShadow: "0 0 24px -2px color-mix(in oklab, var(--primary) 80%, transparent)",
                  }}
                />
              )}
              <Icon className="relative z-10 size-4" strokeWidth={2} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
