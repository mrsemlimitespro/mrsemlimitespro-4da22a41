import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Bootstrap: promove o usuário autenticado atual a admin
 * SOMENTE quando ainda não existe nenhum admin cadastrado.
 * Depois disso, essa função sempre falha, e novos admins só podem ser
 * criados por outro admin dentro do painel.
 */
export const claimInitialAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        "Já existe um administrador. Peça a ele para promover sua conta pelo painel.",
      );
    }

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });

    if (insErr) throw new Error(insErr.message);
    return { ok: true as const };
  });

/**
 * Cria o PRIMEIRO usuário administrador (email + senha).
 * Só funciona quando ainda não existe nenhum admin cadastrado.
 */
export const createInitialAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => {
    const email = String(data?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(data?.password ?? "");
    if (!email || !email.includes("@")) throw new Error("E-mail inválido");
    if (password.length < 6) throw new Error("Senha muito curta (mín. 6 caracteres)");
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("Já existe um administrador cadastrado.");
    }

    // Cria (ou reaproveita) o usuário no auth
    let userId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createErr) {
      // Se já existir, procura na lista
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === data.email);
      if (!found) throw new Error(createErr.message);
      // Atualiza a senha caso a conta já exista
      await supabaseAdmin.auth.admin.updateUserById(found.id, {
        password: data.password,
        email_confirm: true,
      });
      userId = found.id;
    } else {
      userId = created?.user?.id ?? null;
    }

    if (!userId) throw new Error("Não foi possível criar o usuário.");

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (insErr && !insErr.message.includes("duplicate")) {
      throw new Error(insErr.message);
    }

    return { ok: true as const, email: data.email };
  });
