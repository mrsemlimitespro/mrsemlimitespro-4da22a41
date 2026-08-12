import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAILS = ["rogeriocftv.mr@gmail.com", "mariocftv@gmail.com"];

export function isAdminEmail(email?: string | null): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return !!e && ADMIN_EMAILS.includes(e);
}

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let mounted = true;
    const check = (session: { user?: { email?: string | null } | null } | null) => {
      if (!mounted) return;
      setIsAdmin(isAdminEmail(session?.user?.email));
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(s));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return isAdmin;
}
