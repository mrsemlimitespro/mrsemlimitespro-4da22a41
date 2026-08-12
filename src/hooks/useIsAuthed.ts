/**
 * useIsAuthed — versão adaptada para MR Sem Limites (sem AppAuthorizationProvider).
 * Detecta sessão local-first para render imediato, revalida via supabase.auth
 * e reage a mudanças em tempo real.
 *
 *   null  → still checking
 *   true  → user has a session
 *   false → no session
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function localHasSession(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token ?? parsed?.currentSession?.access_token;
          if (token) return true;
        } catch {
          /* ignore */
        }
      }
    }
    return false;
  } catch {
    return null;
  }
}

export function useIsAuthed(): boolean | null {
  // Inicia como `null` para bater com o HTML do SSR (que nunca tem sessão)
  // e evitar hydration mismatch na sidebar/menu que dependem do estado logado.
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const local = localHasSession();
    if (local !== null) setAuthed(local);
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (alive) setAuthed(!!data.user);
      })
      .catch(() => {
        /* keep local-first value */
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);
  return authed;
}
