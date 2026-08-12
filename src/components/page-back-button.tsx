import { ArrowLeft } from "lucide-react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Fallback routes when there is no browser history to go back to.
 * Longest prefix wins.
 */
const FALLBACKS: Array<{ prefix: string; to: string }> = [
  { prefix: "/admin/", to: "/admin" },
  { prefix: "/checkout", to: "/creditos" },
  { prefix: "/packs/", to: "/packs" },
  { prefix: "/prompts/", to: "/prompts" },
  { prefix: "/agents/", to: "/agents" },
  { prefix: "/aulas/", to: "/aulas" },
  { prefix: "/licencas/", to: "/licencas" },
  { prefix: "/clientes/", to: "/clientes" },
  { prefix: "/perfil", to: "/" },
  { prefix: "/creditos", to: "/" },
  { prefix: "/packs", to: "/" },
  { prefix: "/prompts", to: "/" },
  { prefix: "/agents", to: "/" },
  { prefix: "/aulas", to: "/" },
  { prefix: "/licencas", to: "/" },
  { prefix: "/clientes", to: "/" },
  { prefix: "/admin", to: "/" },
];

/**
 * Routes on which the back button should NOT be shown.
 */
const HIDDEN_ON: string[] = ["/", "/login", "/registro", "/esqueci-senha", "/reset-password"];

function fallbackFor(pathname: string): string {
  const match = FALLBACKS.find((f) => pathname.startsWith(f.prefix));
  return match?.to ?? "/";
}

export type PageBackButtonProps = {
  className?: string;
  label?: string;
  /** Explicit fallback route (overrides automatic detection). */
  fallback?: string;
  /** Force render even on routes normally hidden. */
  forceShow?: boolean;
};

export function PageBackButton({
  className,
  label = "Voltar",
  fallback,
  forceShow,
}: PageBackButtonProps) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!forceShow && HIDDEN_ON.includes(pathname)) return null;

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      try {
        router.history.back();
        return;
      } catch {
        /* fallthrough */
      }
    }
    const to = fallback ?? fallbackFor(pathname);
    router.navigate({ to: to as never });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/60 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur-xl transition-colors hover:border-border hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft
        className="size-3.5 transition-transform group-hover:-translate-x-0.5"
        strokeWidth={2.2}
      />
      <span>{label}</span>
    </button>
  );
}

export default PageBackButton;
