/**
 * Cadeia de autorização Admin → Revendedor → Cliente para downloads de Packs.
 *
 * - Admin usa `grantAdminToReseller` para liberar um pack a um revendedor.
 * - Revendedor usa `grantResellerToClient` para liberar aos seus clientes.
 * - Qualquer usuário autenticado usa `requestPackDownload` para obter
 *   autorização de download (função SQL registra o log e incrementa contador).
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

// ------------------------- Admin → Revendedor -------------------------
export const listAdminAuthorizations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pack_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pack_authorizations")
      .select(
        "id,pack_id,revendedor_id,status,expires_at,notes,created_at,revendedores(id,nome,email)",
      )
      .eq("pack_id", data.pack_id)
      .eq("level", "admin_to_reseller")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const grantAdminToReseller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pack_id: z.string().uuid(),
        revendedor_id: z.string().uuid(),
        expires_at: z.string().datetime().optional().nullable(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pack_authorizations")
      .upsert(
        {
          pack_id: data.pack_id,
          revendedor_id: data.revendedor_id,
          level: "admin_to_reseller",
          status: "active",
          expires_at: data.expires_at ?? null,
          notes: data.notes ?? null,
          authorized_by: context.userId,
        },
        { onConflict: "pack_id,revendedor_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const revokeAdminAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pack_authorizations")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("level", "admin_to_reseller");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------- Revendedor → Cliente -----------------------
export const listResellerAuthorizations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pack_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("pack_authorizations")
      .select(
        "id,pack_id,cliente_id,cliente_email,status,expires_at,notes,created_at,clientes(id,nome,email),premium_packs(id,nome,slug)",
      )
      .eq("level", "reseller_to_client")
      .order("created_at", { ascending: false });
    if (data.pack_id) q = q.eq("pack_id", data.pack_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const grantResellerToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pack_id: z.string().uuid(),
        cliente_id: z.string().uuid().optional().nullable(),
        cliente_email: emailSchema.optional(),
        expires_at: z.string().datetime().optional().nullable(),
        notes: z.string().max(500).optional().nullable(),
      })
      .refine((v) => v.cliente_id || v.cliente_email, {
        message: "Informe cliente_id ou cliente_email",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rev } = await context.supabase.rpc("current_revendedor_id");
    const revendedor_id = rev as string | null;
    if (!revendedor_id) throw new Error("Somente revendedores podem liberar packs a clientes.");

    const { data: row, error } = await context.supabase
      .from("pack_authorizations")
      .insert({
        pack_id: data.pack_id,
        revendedor_id,
        cliente_id: data.cliente_id ?? null,
        cliente_email: data.cliente_email ?? null,
        level: "reseller_to_client",
        status: "active",
        expires_at: data.expires_at ?? null,
        notes: data.notes ?? null,
        authorized_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const revokeResellerAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pack_authorizations")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------- Request download --------------------------
export const requestPackDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pack_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // pega email do usuário logado
    const email = (context.claims as { email?: string } | undefined)?.email;
    if (!email) return { ok: false as const, error: "email_missing" };

    const { data: res, error } = await context.supabase.rpc("authorize_pack_download", {
      _pack_id: data.pack_id,
      _email: email,
    });
    if (error) return { ok: false as const, error: error.message };
    return res as { ok: boolean; error?: string; slug?: string };
  });
