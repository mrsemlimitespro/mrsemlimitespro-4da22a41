import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./_guard";
import type { AdminPremiumPack, PremiumPack, PremiumPackSourceType } from "./types";

const statusEnum = z.enum(["ativo", "rascunho", "em_breve"]);
const visibilityEnum = z.enum(["publico", "privado", "expirado", "desativado"]);
const salesPlatformEnum = z.enum([
  "kiwify",
  "hotmart",
  "perfectpay",
  "cakto",
  "monetizze",
  "eduzz",
  "outro",
]);
const sourceTypeEnum = z.enum([
  "none",
  "google_drive",
  "dropbox",
  "onedrive",
  "cloudflare_r2",
  "supabase_storage",
  "local",
  "outro",
]);

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/i, "Slug inválido"),
  nome: z.string().trim().min(1).max(200),
  categoria: z.string().trim().min(1).max(80).default("geral"),
  descricao_curta: z.string().trim().max(400).nullable().optional(),
  descricao_completa: z.string().trim().max(20000).nullable().optional(),
  capa_url: z.string().trim().max(2000).nullable().optional(),
  banner_url: z.string().trim().max(2000).nullable().optional(),
  icone_url: z.string().trim().max(2000).nullable().optional(),
  video_url: z.string().trim().max(2000).nullable().optional(),
  galeria: z.array(z.string().trim().max(2000)).max(50).default([]),
  tags: z.array(z.string().trim().max(60)).max(40).default([]),
  status: statusEnum.default("rascunho"),
  destaque: z.boolean().default(false),
  is_shareable: z.boolean().default(true),
  allow_download: z.boolean().default(true),
  allow_view: z.boolean().default(true),
  qtd_arquivos: z.number().int().min(0).default(0),
  espaco_bytes: z.number().int().min(0).default(0),
  ordem: z.number().int().min(0).default(0),
  autor: z.string().trim().max(160).nullable().optional(),
  versao: z.string().trim().max(40).nullable().optional(),
  compatibilidade: z.array(z.string().trim().max(80)).max(40).default([]),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  qr_code_url: z.string().trim().max(2000).nullable().optional(),
  public_link: z.string().trim().max(2000).nullable().optional(),
  seo_meta_title: z.string().trim().max(180).nullable().optional(),
  seo_meta_description: z.string().trim().max(320).nullable().optional(),
  og_image_url: z.string().trim().max(2000).nullable().optional(),
  twitter_image_url: z.string().trim().max(2000).nullable().optional(),
  // === Origem do Conteúdo (admin-only) ===
  source_type: sourceTypeEnum.default("none"),
  /**
   * Plain-text source folder URL. Encrypted server-side before persisting em
   * `source_url_encrypted`. Use "__KEEP__" para preservar valor existente;
   * string vazia limpa.
   */
  source_folder_url: z.string().trim().max(2000).optional(),
  // === Links de Venda (admin-only) ===
  visibility_status: visibilityEnum.default("publico"),
  sales_platform: salesPlatformEnum.nullable().optional(),
  /** URL externa do checkout — armazenada em `sales_product_id` no schema. */
  sales_url: z.string().trim().max(2000).nullable().optional(),
});

export type AdminPackInput = z.infer<typeof upsertSchema>;

const ADMIN_LIST_COLUMNS =
  "id,slug,public_token,visibility_status,sales_platform,sales_product_id,nome,categoria,descricao_curta,descricao_completa,banner_url,capa_url,icone_url,video_url,galeria,tags,status,destaque,is_shareable,allow_download,allow_view,qtd_arquivos,espaco_bytes,ordem,downloads,views,popularidade,autor,versao,compatibilidade,observacoes,qr_code_url,public_link,seo_meta_title,seo_meta_description,og_image_url,twitter_image_url,source_type,source_metadata,drive_url,archive_url,ultima_atualizacao,created_at,updated_at";

export const adminListPremiumPacks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().trim().max(160).optional(),
        status: statusEnum.optional(),
        categoria: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .default({ limit: 100, offset: 0 })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: PremiumPack[]; total: number }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("premium_packs")
      .select(ADMIN_LIST_COLUMNS, { count: "exact" })
      .order("destaque", { ascending: false })
      .order("ordem", { ascending: true })
      .order("updated_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status) q = q.eq("status", data.status);
    if (data.categoria) q = q.eq("categoria", data.categoria);
    if (data.q) {
      const safe = data.q.replace(/[%,]/g, " ").trim();
      if (safe)
        q = q.or(`nome.ilike.%${safe}%,slug.ilike.%${safe}%,descricao_curta.ilike.%${safe}%`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as unknown as PremiumPack[], total: count ?? 0 };
  });

export const adminGetPremiumPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<PremiumPack | null> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("premium_packs")
      .select(ADMIN_LIST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as unknown as PremiumPack | null) ?? null;
  });

/**
 * Admin-only: retorna se um source URL privado existe para o pack e, quando
 * solicitado explicitamente, a URL descriptografada.
 */
export const adminRevealPackSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reveal: z.boolean().default(false) }).parse(d),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      has_source: boolean;
      source_type: PremiumPackSourceType;
      source_folder_url: string | null;
      source_metadata_json: string;
    }> => {
      await assertAdmin(context.supabase, context.userId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("premium_packs")
        .select("source_type, source_url_encrypted, source_metadata")
        .eq("id", data.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const r = row as {
        source_type?: string | null;
        source_url_encrypted?: unknown;
        source_metadata?: unknown;
      } | null;
      const blob = (r?.source_url_encrypted ?? null) as {
        v: 1;
        iv: string;
        tag: string;
        ct: string;
      } | null;
      let plain: string | null = null;
      if (data.reveal && blob) {
        const { decryptSecret } = await import("./crypto.server");
        plain = decryptSecret(blob);
      }
      return {
        has_source: !!blob,
        source_type: (r?.source_type ?? "none") as PremiumPackSourceType,
        source_folder_url: plain,
        source_metadata_json: JSON.stringify(r?.source_metadata ?? {}),
      };
    },
  );

export const adminUpsertPremiumPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }): Promise<PremiumPack> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { source_folder_url, sales_url, ...rest } = data;
    const payload: Record<string, unknown> = {
      ...rest,
      // Schema MR Sem Limites usa `sales_product_id` como URL/id do produto.
      sales_product_id: sales_url ?? null,
      ultima_atualizacao: new Date().toISOString(),
    };

    if (source_folder_url !== undefined && source_folder_url !== "__KEEP__") {
      if (source_folder_url.length === 0) {
        payload.source_url_encrypted = null;
      } else {
        const { encryptSecret } = await import("./crypto.server");
        payload.source_url_encrypted = encryptSecret(source_folder_url);
      }
    }

    let savedRow: PremiumPack;
    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("premium_packs")
        .update(payload as never)
        .eq("id", data.id)
        .select(ADMIN_LIST_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      savedRow = row as unknown as PremiumPack;
    } else {
      const { id: _ignored, ...insertPayload } = payload as { id?: string } & Record<
        string,
        unknown
      >;
      const { data: row, error } = await supabaseAdmin
        .from("premium_packs")
        .insert(insertPayload as never)
        .select(ADMIN_LIST_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      savedRow = row as unknown as PremiumPack;
    }
    return savedRow;
  });

export const adminDuplicatePremiumPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<PremiumPack> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error: errSrc } = await supabaseAdmin
      .from("premium_packs")
      .select("*")
      .eq("id", data.id)
      .single();
    if (errSrc || !src) throw new Error(errSrc?.message ?? "Pack não encontrado");
    const {
      id: _id,
      created_at: _c,
      updated_at: _u,
      public_token: _pt,
      ...rest
    } = src as AdminPremiumPack & Record<string, unknown>;
    const suffix = Math.random().toString(36).slice(2, 6);
    const copy = {
      ...rest,
      slug: `${(src as { slug: string }).slug}-copia-${suffix}`.slice(0, 160),
      nome: `${(src as { nome: string }).nome} (cópia)`.slice(0, 200),
      status: "rascunho" as const,
      destaque: false,
      ultima_atualizacao: new Date().toISOString(),
    };
    const { data: row, error } = await supabaseAdmin
      .from("premium_packs")
      .insert(copy as never)
      .select(ADMIN_LIST_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as PremiumPack;
  });

export const adminDeletePremiumPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("premium_packs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera um novo token público único para a URL curta do pack. */
export const adminRegeneratePublicToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ id: string; public_token: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { randomBytes } = await import("crypto");
    const token = randomBytes(5)
      .toString("base64url")
      .replace(/[-_]/g, "")
      .toUpperCase()
      .slice(0, 8);
    const { data: row, error } = await supabaseAdmin
      .from("premium_packs")
      .update({ public_token: token } as never)
      .eq("id", data.id)
      .select("id, public_token")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string; public_token: string };
  });
