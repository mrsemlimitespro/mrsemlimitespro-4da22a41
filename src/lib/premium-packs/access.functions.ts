/**
 * Pack Access — Server functions de concessão/revogação manual de acesso.
 *
 * Restritas a Admin (via `has_role`). Toda operação grava em `pack_access`
 * com `origin = 'manual'` para distinguir de webhooks de venda.
 *
 * Adaptação MR Sem Limites: não existe tabela `subscribers`; o vínculo com
 * `user_id` é resolvido diretamente pela tabela `auth.users` via Admin API.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./_guard";

const emailSchema = z
  .string()
  .email()
  .max(320)
  .transform((v) => v.toLowerCase().trim());

export const listPackAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        pack_id: z.string().uuid(),
        search: z.string().max(120).optional(),
        status: z.enum(["all", "active", "cancelled", "refunded", "chargeback"]).default("all"),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("pack_access")
      .select(
        "id, pack_id, email, user_id, status, origin, gateway, amount_cents, currency, purchased_at, revoked_at, notes, created_at",
      )
      .eq("pack_id", data.pack_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.search) q = q.ilike("email", `%${data.search}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Auth Admin: listUsers não filtra por email diretamente, mas o endpoint aceita a query.
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
  return match?.id ?? null;
}

export const grantPackAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        pack_id: z.string().uuid(),
        email: emailSchema,
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const userId = await resolveUserIdByEmail(data.email);

    const { data: row, error } = await supabaseAdmin
      .from("pack_access")
      .upsert(
        {
          pack_id: data.pack_id,
          email: data.email,
          user_id: userId,
          gateway: "manual",
          status: "active",
          origin: "manual",
          notes: data.notes ?? null,
          purchased_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "pack_id,email" },
      )
      .select("id, email, status")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, access: row };
  });

export const revokePackAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        pack_id: z.string().uuid(),
        email: emailSchema,
        reason: z.string().max(280).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pack_access")
      .update({
        status: "cancelled",
        revoked_at: new Date().toISOString(),
        notes: data.reason ?? null,
      })
      .eq("pack_id", data.pack_id)
      .ilike("email", data.email);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restorePackAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ pack_id: z.string().uuid(), email: emailSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pack_access")
      .update({ status: "active", revoked_at: null })
      .eq("pack_id", data.pack_id)
      .ilike("email", data.email);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
