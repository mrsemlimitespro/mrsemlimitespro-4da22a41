import * as React from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Shell reutilizável para módulos AI (AI Agents, AI Prompts, …).
 * Módulos compartilham o mesmo design system — layout, espaço, tipografia,
 * cards, animações — e diferem apenas na identidade cromática, aplicada via
 * `data-ai-theme` (tokens `ai-*` em styles.css).
 *
 *   AI Prompts  → data-ai-theme="prompts"  (rose / magenta / gold)
 *   AI Agents   → data-ai-theme="agents"   (cyan / blue / violet)
 */
export type AIModuleTheme = "prompts" | "agents" | "packs";

export interface AIModuleShellProps {
  theme: AIModuleTheme;
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  search?: {
    placeholder?: string;
    value?: string;
    onChange?: (v: string) => void;
    disabled?: boolean;
  };
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AIModuleShell({
  theme,
  eyebrow,
  title,
  description,
  meta,
  search,
  actions,
  children,
  className,
}: AIModuleShellProps) {
  return (
    <div
      data-ai-theme={theme}
      className={cn("ai-module relative w-full animate-fade-in", className)}
    >
      <AIModuleHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={meta}
        search={search}
        actions={actions}
      />
      {children}
    </div>
  );
}

function AIModuleHero({
  eyebrow,
  title,
  description,
  meta,
  search,
  actions,
}: Pick<AIModuleShellProps, "eyebrow" | "title" | "description" | "meta" | "search" | "actions">) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-ai-300/15 bg-gradient-to-br from-ai-500/[0.06] via-black/40 to-ai-400/[0.04] p-5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-10 h-56 w-56 rounded-full bg-ai-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-ai-400/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-ai-300/30 bg-ai-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-ai-100">
              <Sparkles className="h-3 w-3" />
              {eyebrow}
            </div>
          )}
          <h1 className="bg-gradient-to-r from-ai-50 via-ai-200 to-ai-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-white/60">
              {description}
              {meta ? <span className="ml-1 text-white/40">· {meta}</span> : null}
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {search && (
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ai-200/60" />
              <Input
                placeholder={search.placeholder ?? "Buscar..."}
                value={search.value ?? ""}
                onChange={(e) => search.onChange?.(e.target.value)}
                disabled={search.disabled}
                className="pl-9 bg-white/[0.04] border-ai-300/20 text-white placeholder:text-white/35 focus-visible:border-ai-300/60 focus-visible:ring-ai-500/20"
              />
            </div>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}

export function AICard({
  className,
  glow = true,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      {...rest}
      className={cn(
        "group relative rounded-2xl border border-ai-300/15 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-4 transition-all duration-300",
        "hover:border-ai-300/40 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px_var(--ai-500)]",
        glow &&
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-ai-500/0 before:to-ai-400/0 hover:before:from-ai-500/10 hover:before:to-ai-400/5 before:transition",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AIPill({
  active,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition",
        active
          ? "border-ai-300/60 text-ai-50 bg-ai-500/15 shadow-[0_0_18px_-6px_var(--ai-500)]"
          : "border-ai-300/15 text-ai-100/60 bg-black/40 hover:border-ai-300/40 hover:text-ai-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AIEmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ai-300/20 bg-gradient-to-br from-ai-500/[0.04] via-black/40 to-ai-400/[0.03] p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-ai-500/30 to-ai-400/20 shadow-[0_0_30px_-8px_var(--ai-500)]">
        <Icon className="h-7 w-7 text-ai-100" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
      {description && <p className="mx-auto max-w-md text-sm text-white/55">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
