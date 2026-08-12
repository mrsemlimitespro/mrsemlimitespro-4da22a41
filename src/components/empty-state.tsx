import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface EmptyStateProps {
  icon?: IconType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState — placeholder consistente para listas vazias.
 * Segue o design system MR Lova (dark, gradient, glass).
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-surface/40 px-6 py-10 text-center backdrop-blur-sm",
        className,
      )}
    >
      {Icon && (
        <div
          className="grid size-14 place-items-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--brand-magenta) 25%, transparent), color-mix(in oklab, var(--brand-blue) 25%, transparent))",
            boxShadow:
              "0 0 0 1px oklch(1 0 0 / 6%), 0 8px 30px -8px color-mix(in oklab, var(--brand-magenta) 45%, transparent)",
          }}
        >
          <Icon className="size-6 text-foreground/80" strokeWidth={1.8} />
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
