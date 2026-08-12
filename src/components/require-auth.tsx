import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsAuthed } from "@/hooks/useIsAuthed";

/**
 * Client-side guard for commercial routes.
 * Public routes (/, /agents, /prompts) don't use this.
 * Commercial routes (/creditos, /packs, /licencas, /clientes, /perfil, /aulas) wrap
 * their content with <RequireAuth> to redirect anonymous users to /login.
 *
 * Uses client-only detection (localStorage → supabase.auth) to avoid SSR mismatches
 * — Supabase session lives in localStorage which the server cannot read.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const authed = useIsAuthed();
  const navigate = useNavigate();

  useEffect(() => {
    if (authed === false) {
      navigate({ to: "/login" });
    }
  }, [authed, navigate]);

  if (authed === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (authed === false) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">
        Redirecionando para entrar…
      </div>
    );
  }
  return <>{children}</>;
}
