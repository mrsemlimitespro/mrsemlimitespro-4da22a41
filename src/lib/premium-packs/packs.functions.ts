import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ListPremiumPacksResult, PremiumPack, PremiumPackSort } from "./types";

// Public-safe column projection — NEVER includes `source_url_encrypted`
// or `source_metadata` (admin-only). Keeping this explicit prevents
// future `select('*')` regressions from leaking the private origin blob.
const PUBLIC_COLUMNS =
  "id,slug,public_token,visibility_status,nome,categoria,descricao_curta,descricao_completa,banner_url,capa_url,icone_url,video_url,galeria,tags,status,destaque,is_shareable,allow_download,allow_view,qtd_arquivos,espaco_bytes,ordem,downloads,views,popularidade,autor,versao,compatibilidade,observacoes,qr_code_url,public_link,seo_meta_title,seo_meta_description,og_image_url,twitter_image_url,source_type,drive_url,archive_url,ultima_atualizacao,created_at,updated_at";

const sortSchema = z.enum(["recentes", "atualizados", "baixados", "populares", "nome"]);

const listSchema = z
  .object({
    q: z.string().trim().max(160).optional(),
    categoria: z.string().trim().max(80).optional(),
    sort: sortSchema.default("recentes"),
    limit: z.number().int().min(1).max(60).default(24),
    offset: z.number().int().min(0).default(0),
  })
  .default({ sort: "recentes", limit: 24, offset: 0 });

function orderFor(sort: PremiumPackSort): { column: string; ascending: boolean } {
  switch (sort) {
    case "atualizados":
      return { column: "ultima_atualizacao", ascending: false };
    case "baixados":
      return { column: "downloads", ascending: false };
    case "populares":
      return { column: "popularidade", ascending: false };
    case "nome":
      return { column: "nome", ascending: true };
    case "recentes":
    default:
      return { column: "created_at", ascending: false };
  }
}

function publicClient() {
  // Import dinâmico para não expor supabase-js no bundle do client.
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

export const listPremiumPacks = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data }): Promise<ListPremiumPacksResult> => {
    const supabase = await publicClient();
    const ord = orderFor(data.sort);
    let query = supabase
      .from("premium_packs")
      .select(PUBLIC_COLUMNS, { count: "exact" })
      .eq("status", "ativo")
      .eq("visibility_status", "publico")
      .order(ord.column, { ascending: ord.ascending })
      .order("ordem", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.categoria) query = query.eq("categoria", data.categoria);
    if (data.q && data.q.length > 0) {
      const safe = data.q.replace(/[%,]/g, " ").trim();
      if (safe) query = query.or(`nome.ilike.%${safe}%,descricao_curta.ilike.%${safe}%`);
    }
    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as PremiumPack[];
    const nextOffset = data.offset + list.length;
    const total = count ?? nextOffset;
    return { rows: list, total, nextOffset: nextOffset < total ? nextOffset : null };
  });

export const getPremiumPackBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(160) }).parse(d))
  .handler(async ({ data }): Promise<PremiumPack | null> => {
    const supabase = await publicClient();
    const { data: row, error } = await supabase
      .from("premium_packs")
      .select(PUBLIC_COLUMNS)
      .eq("slug", data.slug)
      .eq("status", "ativo")
      .eq("visibility_status", "publico")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as unknown as PremiumPack | null) ?? null;
  });

/**
 * Resolves a pack by its short public token (used in /p/<slug>-<TOKEN>).
 * Returns the pack only when visibility allows public viewing.
 */
export const getPremiumPackByToken = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().trim().min(4).max(32) }).parse(d))
  .handler(async ({ data }): Promise<PremiumPack | null> => {
    const supabase = await publicClient();
    const { data: row, error } = await supabase
      .from("premium_packs")
      .select(PUBLIC_COLUMNS)
      .eq("public_token", data.token.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    const pack = (row as unknown as PremiumPack | null) ?? null;
    if (!pack) return null;
    if (pack.visibility_status === "desativado" || pack.visibility_status === "expirado") {
      return null;
    }
    return pack;
  });
