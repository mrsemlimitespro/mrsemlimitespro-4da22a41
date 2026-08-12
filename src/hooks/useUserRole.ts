/**
 * useUserRole — papel do usuário atual na plataforma.
 *
 *   "loading"    → ainda checando sessão / tabelas
 *   "visitor"    → sem sessão
 *   "admin"      → user_roles.admin OU email na lista ADMIN_EMAILS
 *   "revendedor" → possui linha em public.revendedores (auth_user_id)
 *   "cliente"    → autenticado sem ser admin nem revendedor
 *
 * Não altera banco. Não muda RLS. Reage a onAuthStateChange.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/hooks/useIsAdmin";

export type UserRole = "loading" | "visitor" | "admin" | "revendedor" | "cliente";

async function detectRole(user: { id: string; email?: string | null } | null): Promise<UserRole> {
  if (!user) return "visitor";
  if (isAdminEmail(user.email)) return "admin";

  // Checagem paralela: role admin em user_roles + registro em revendedores
  const [adminRes, revRes] = await Promise.all([
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    supabase
      .from("revendedores")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);

  if (adminRes.data === true) return "admin";
  if (revRes.data?.id) return "revendedor";
  return "cliente";
}

export function useUserRole(): UserRole {
  const [role, setRole] = useState<UserRole>("loading");

  useEffect(() => {
    let alive = true;

    const check = async (session: { user?: { id: string; email?: string | null } | null } | null) => {
      const r = await detectRole(session?.user ?? null);
      if (alive) setRole(r);
    };

    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void check(session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return role;
}

export function isPrivilegedRole(role: UserRole): boolean {
  return role === "admin" || role === "revendedor";
}
