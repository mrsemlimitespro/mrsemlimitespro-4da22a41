/**
 * Biblioteca de Prompts — Server Functions.
 * Adaptado do projeto Link MR Store Pro para o schema atual do MR Sem Limites:
 * - `download_count` (origem) → `downloads` (destino)
 * - `status` (origem: text[]) → `status` (destino: text scalar). Normalizado
 *   como array de 0 ou 1 elemento no retorno para manter a UI intacta.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LibraryPrompt = {
  id: string;
  numero: number;
  categoria: string;
  subcategoria: string;
  titulo: string;
  descricao: string;
  autor: string;
  tags: string[];
  cover_url: string | null;
  destaque: boolean;
  nivel: string;
  versao: string;
  status: string[];
  compatibilidade: string[];
  uso_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
};

/** Colunas reais no MR Sem Limites (usa `downloads`, não `download_count`). */
const LIST_COLS =
  "id,numero,categoria,subcategoria,titulo,descricao,autor,tags,cover_url,destaque,nivel,versao,status,compatibilidade,uso_count,downloads,created_at,updated_at";

/** Normaliza um row do banco (status scalar) para o formato de UI (status[]). */
function normalizePrompt(row: Record<string, unknown>): LibraryPrompt {
  const rawStatus = row.status;
  const statusArr =
    typeof rawStatus === "string" && rawStatus.trim().length > 0
      ? [rawStatus.trim()]
      : Array.isArray(rawStatus)
        ? (rawStatus as string[]).filter(Boolean)
        : [];
  return {
    id: String(row.id ?? ""),
    numero: Number(row.numero ?? 0),
    categoria: String(row.categoria ?? ""),
    subcategoria: String(row.subcategoria ?? ""),
    titulo: String(row.titulo ?? ""),
    descricao: String(row.descricao ?? ""),
    autor: String(row.autor ?? ""),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    cover_url: (row.cover_url as string | null) ?? null,
    destaque: Boolean(row.destaque),
    nivel: String(row.nivel ?? ""),
    versao: String(row.versao ?? ""),
    status: statusArr,
    compatibilidade: Array.isArray(row.compatibilidade) ? (row.compatibilidade as string[]) : [],
    uso_count: Number(row.uso_count ?? 0),
    download_count: Number(row.downloads ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const sortKey = z.enum([
  "recent",
  "oldest",
  "numero",
  "popular",
  "most_used",
  "most_downloaded",
  "az",
  "za",
]);

const listSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(120).default(48),
  search: z.string().trim().max(120).default(""),
  categoria: z.string().trim().max(80).optional(),
  subcategoria: z.string().trim().max(80).optional(),
  compatibilidade: z.array(z.string()).optional(),
  nivel: z.string().optional(),
  status: z.array(z.string()).optional(),
  autor: z.string().optional(),
  sort: sortKey.default("recent"),
  onlyDestaque: z.boolean().optional(),
  ids: z.array(z.string().uuid()).optional(),
});

export type ListPromptsInput = z.infer<typeof listSchema>;

export const listPromptsPaged = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabaseAdmin
      .from("ai_prompts")
      .select(LIST_COLS, { count: "exact" })
      .eq("ativo", true)
      .eq("oculto", false)
      .eq("mostrar_premium", true);

    if (data.ids && data.ids.length) q = q.in("id", data.ids);
    if (data.categoria) q = q.eq("categoria", data.categoria);
    if (data.subcategoria) q = q.eq("subcategoria", data.subcategoria);
    if (data.nivel) q = q.eq("nivel", data.nivel);
    if (data.autor) q = q.eq("autor", data.autor);
    if (data.onlyDestaque) q = q.eq("destaque", true);
    if (data.compatibilidade?.length) q = q.contains("compatibilidade", data.compatibilidade);
    // status é escalar no destino — usar .in() para múltiplos chips selecionados.
    if (data.status?.length) q = q.in("status", data.status);

    if (data.search) {
      const s = data.search.replace(/[%]/g, "");
      const asNumber = Number(s);
      const numFilter = Number.isFinite(asNumber) ? `,numero.eq.${asNumber}` : "";
      q = q.or(
        `titulo.ilike.%${s}%,descricao.ilike.%${s}%,categoria.ilike.%${s}%,subcategoria.ilike.%${s}%,autor.ilike.%${s}%${numFilter}`,
      );
    }

    switch (data.sort) {
      case "oldest":
        q = q.order("created_at", { ascending: true });
        break;
      case "numero":
        q = q.order("numero", { ascending: true });
        break;
      case "popular":
        q = q.order("destaque", { ascending: false }).order("uso_count", { ascending: false });
        break;
      case "most_used":
        q = q.order("uso_count", { ascending: false });
        break;
      case "most_downloaded":
        q = q.order("downloads", { ascending: false });
        break;
      case "az":
        q = q.order("titulo", { ascending: true });
        break;
      case "za":
        q = q.order("titulo", { ascending: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }
    q = q.order("id", { ascending: false }).range(from, to);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return {
      items: (rows ?? []).map((r) => normalizePrompt(r as Record<string, unknown>)),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

/** Categorias + contagem + subcategorias agregadas a partir do banco. */
export const listPromptCategoriesTree = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const acc: Record<string, { total: number; subs: Record<string, number> }> = {};
  const CHUNK = 1000;
  for (let off = 0; off < 50000; off += CHUNK) {
    const { data, error } = await supabaseAdmin
      .from("ai_prompts")
      .select("categoria,subcategoria")
      .eq("ativo", true)
      .eq("oculto", false)
      .eq("mostrar_premium", true)
      .range(off, off + CHUNK - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Array<{ categoria: string | null; subcategoria: string | null }>;
    for (const r of batch) {
      const c = (r.categoria || "Outros").trim() || "Outros";
      const s = (r.subcategoria || "").trim();
      if (!acc[c]) acc[c] = { total: 0, subs: {} };
      acc[c].total += 1;
      if (s) acc[c].subs[s] = (acc[c].subs[s] ?? 0) + 1;
    }
    if (batch.length < CHUNK) break;
  }
  return Object.entries(acc)
    .map(([categoria, v]) => ({
      categoria,
      total: v.total,
      subs: Object.entries(v.subs)
        .map(([nome, count]) => ({ nome, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "pt-BR"));
});

export const listRecommendations = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), limit: z.number().int().min(1).max(24).default(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: base, error: e1 } = await supabaseAdmin
      .from("ai_prompts")
      .select("id,categoria,subcategoria,tags,compatibilidade")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!base) return [] as LibraryPrompt[];
    let q = supabaseAdmin
      .from("ai_prompts")
      .select(LIST_COLS)
      .eq("ativo", true)
      .eq("oculto", false)
      .eq("mostrar_premium", true)
      .neq("id", data.id)
      .limit(data.limit);
    if ((base as { categoria?: string }).categoria) {
      q = q.eq("categoria", (base as { categoria: string }).categoria);
    }
    const { data: rows, error } = await q.order("destaque", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => normalizePrompt(r as Record<string, unknown>));
  });

/* ===== Favoritos ===== */

export const listFavoriteIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("prompt_favorites")
      .select("prompt_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { prompt_id: string }) => r.prompt_id);
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ promptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: existing } = await context.supabase
      .from("prompt_favorites")
      .select("prompt_id")
      .eq("user_id", userId)
      .eq("prompt_id", data.promptId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("prompt_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("prompt_id", data.promptId);
      if (error) throw new Error(error.message);
      return { favorited: false };
    }
    const { error } = await context.supabase
      .from("prompt_favorites")
      .insert({ user_id: userId, prompt_id: data.promptId });
    if (error) throw new Error(error.message);
    return { favorited: true };
  });

/* ===== Histórico ===== */

export const recordPromptUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        promptId: z.string().uuid(),
        action: z.enum(["open", "copy", "download"]).default("open"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("prompt_history")
      .insert({ user_id: context.userId, prompt_id: data.promptId, action: data.action });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRecentPromptIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(60).default(24) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("prompt_history")
      .select("prompt_id,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit * 3);
    if (error) throw new Error(error.message);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows ?? []) {
      const id = (r as { prompt_id: string }).prompt_id;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= data.limit) break;
    }
    return out;
  });
