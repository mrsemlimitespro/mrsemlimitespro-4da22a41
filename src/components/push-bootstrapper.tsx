/**
 * PushBootstrapper — inicia o PushService quando há sessão Supabase.
 * Não renderiza nada. Segue a arquitetura NativeService: nenhum plugin
 * é importado aqui diretamente.
 */
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { startPush, stopPush } from "@/lib/push-init";

export function PushBootstrapper() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        void startPush(router, data.session.user.id);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        void stopPush();
        return;
      }
      if (session?.user) {
        void startPush(router, session.user.id);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
