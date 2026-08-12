/**
 * Guarda client-side: se o revendedor autenticado tem must_change_password=true,
 * força a navegação para /redefinir-senha.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function MustChangePasswordGuard() {
  const nav = useNavigate();
  const loc = useLocation();

  const { data } = useQuery({
    queryKey: ["must-change-password"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return { must: false };
      const { data: rev } = await (supabase as any)
        .from("revendedores")
        .select("must_change_password,deleted_at")
        .eq("auth_user_id", uid)
        .maybeSingle();
      return { must: !!rev?.must_change_password && !rev?.deleted_at };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data?.must) return;
    if (loc.pathname === "/redefinir-senha") return;
    nav({ to: "/redefinir-senha", replace: true });
  }, [data?.must, loc.pathname, nav]);

  return null;
}
