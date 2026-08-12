/**
 * Dashboard stats (AI Prompts / AI Agents).
 * Copiado verbatim do projeto Link MR Store Pro — funciona com schema atual
 * do MR Sem Limites (mesmas colunas em ai_prompts, ai_agents, prompt_favorites,
 * prompt_history).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["prompts", "agents", "packs"]),
});

export type AINovaStats = {
  kind: "prompts" | "agents" | "packs";
  total: number;
  destaques: number;
  totalUsos: number;
  favoritos: number;
  novosSemana: number;
  recents: Array<{ id: string; titulo: string; categoria: string | null; created_at: string }>;
  activity: Array<{ id: string; titulo: string; action: string; created_at: string }>;
  weekly: Array<{ date: string; count: number }>;
  topCategorias: Array<{ categoria: string; count: number }>;
};

function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export const getAINovaStats = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => schema.parse(d ?? { kind: "prompts" }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isPacks = data.kind === "packs";
    const table =
      data.kind === "prompts"
        ? "ai_prompts"
        : data.kind === "agents"
          ? "ai_agents"
          : "premium_packs";

    // Column name that stores the display title differs per module.
    const titleCol = isPacks ? "nome" : "titulo";
    // Column used as usage counter (downloads for packs, uso_count for prompts/agents).
    const usoCol = isPacks ? "downloads" : "uso_count";

    const now = new Date();
    const sevenDaysAgo = startOfDayUTC(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));

    const applyBase = (q: any) => {
      if (isPacks) {
        return q.eq("status", "ativo").eq("visibility_status", "publico");
      }
      q = q.eq("ativo", true).eq("oculto", false);
      if (data.kind === "prompts") q = q.eq("mostrar_premium", true);
      return q;
    };

    const [totalRes, destRes, novosRes, recentsRes, weeklyRes, catsRes, usosRes, favRes] =
      await Promise.all([
        applyBase(supabaseAdmin.from(table).select("id", { count: "exact", head: true })),
        applyBase(supabaseAdmin.from(table).select("id", { count: "exact", head: true })).eq(
          "destaque",
          true,
        ),
        applyBase(supabaseAdmin.from(table).select("id", { count: "exact", head: true })).gte(
          "created_at",
          sevenDaysAgo.toISOString(),
        ),
        applyBase(
          supabaseAdmin
            .from(table)
            .select(`id,${titleCol},categoria,created_at`)
            .order("created_at", { ascending: false })
            .limit(4),
        ),
        applyBase(
          supabaseAdmin
            .from(table)
            .select("created_at")
            .gte("created_at", sevenDaysAgo.toISOString())
            .limit(2000),
        ),
        applyBase(supabaseAdmin.from(table).select("categoria").limit(5000)),
        applyBase(supabaseAdmin.from(table).select(usoCol).limit(5000)),
        data.kind === "prompts"
          ? supabaseAdmin
              .from("prompt_favorites")
              .select("prompt_id", { count: "exact", head: true })
          : Promise.resolve({ count: 0 } as any),
      ]);

    const total = totalRes.count ?? 0;
    const destaques = destRes.count ?? 0;
    const novosSemana = novosRes.count ?? 0;
    const favoritos = (favRes as any).count ?? 0;

    const totalUsos = ((usosRes.data ?? []) as Array<Record<string, number | null>>).reduce(
      (acc, r) => acc + (Number(r[usoCol]) || 0),
      0,
    );

    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDayUTC(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      days.push(d.toISOString().slice(0, 10));
    }
    const bucket = new Map<string, number>(days.map((d) => [d, 0]));
    for (const r of (weeklyRes.data ?? []) as Array<{ created_at: string }>) {
      const k = r.created_at.slice(0, 10);
      if (bucket.has(k)) bucket.set(k, (bucket.get(k) ?? 0) + 1);
    }
    const weekly = days.map((date) => ({ date, count: bucket.get(date) ?? 0 }));

    const catMap = new Map<string, number>();
    for (const r of (catsRes.data ?? []) as Array<{ categoria: string | null }>) {
      const c = (r.categoria || "Outros").trim() || "Outros";
      catMap.set(c, (catMap.get(c) ?? 0) + 1);
    }
    const topCategorias = [...catMap.entries()]
      .map(([categoria, count]) => ({ categoria, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    let activity: AINovaStats["activity"] = [];
    if (data.kind === "prompts") {
      const { data: hist } = await supabaseAdmin
        .from("prompt_history")
        .select("prompt_id,action,created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      const ids = [...new Set((hist ?? []).map((h: any) => h.prompt_id))];
      let titleMap = new Map<string, string>();
      if (ids.length) {
        const { data: titulos } = await supabaseAdmin
          .from("ai_prompts")
          .select("id,titulo")
          .in("id", ids);
        titleMap = new Map((titulos ?? []).map((t: any) => [t.id, t.titulo]));
      }
      activity = ((hist ?? []) as Array<any>)
        .filter((h) => titleMap.has(h.prompt_id))
        .slice(0, 4)
        .map((h) => ({
          id: h.prompt_id,
          titulo: titleMap.get(h.prompt_id) ?? "Prompt",
          action: h.action ?? "open",
          created_at: h.created_at,
        }));
    } else {
      const { data: upd } = await applyBase(
        supabaseAdmin
          .from(table)
          .select(`id,${titleCol},updated_at,created_at`)
          .order("updated_at", { ascending: false })
          .limit(4),
      );
      activity = ((upd ?? []) as Array<any>).map((r) => ({
        id: r.id,
        titulo: r[titleCol],
        action: "updated",
        created_at: r.updated_at ?? r.created_at,
      }));
    }

    const recents = ((recentsRes.data ?? []) as Array<any>).map((r) => ({
      id: r.id,
      titulo: r[titleCol],
      categoria: r.categoria ?? null,
      created_at: r.created_at,
    }));

    const result: AINovaStats = {
      kind: data.kind,
      total,
      destaques,
      totalUsos,
      favoritos,
      novosSemana,
      recents,
      activity,
      weekly,
      topCategorias,
    };
    return result;
  });
