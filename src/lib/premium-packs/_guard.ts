/**
 * Guard admin reutilizado pelas server functions de Packs Premium.
 * Valida a role via `public.has_role(auth.uid(),'admin')` usando o client
 * já autenticado do middleware `requireSupabaseAuth`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertAdmin(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores.");
}
