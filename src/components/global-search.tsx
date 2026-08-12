import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Busca global admin — Fase 2B.
 * Somente leitura: consulta múltiplas tabelas por ILIKE e navega para a
 * tela correspondente no clique. Nenhuma alteração no schema.
 */
type Hit = {
  kind: string;
  emoji: string;
  primary: string;
  secondary?: string;
  to: string;
};

const SOURCES: Array<{
  kind: string;
  emoji: string;
  table: string;
  fields: string[];
  toPath: (row: any) => string;
  primary: (row: any) => string;
  secondary?: (row: any) => string;
}> = [
  {
    kind: "Cliente",
    emoji: "👤",
    table: "clientes",
    fields: ["nome", "email"],
    toPath: () => "/admin/clientes",
    primary: (r) => r.nome || r.email || "—",
    secondary: (r) => r.email,
  },
  {
    kind: "Revendedor",
    emoji: "🏪",
    table: "revendedores",
    fields: ["nome", "email"],
    toPath: () => "/admin/revendedores",
    primary: (r) => r.nome || r.email || "—",
    secondary: (r) => r.email,
  },
  {
    kind: "Licença",
    emoji: "🔑",
    table: "licencas",
    fields: ["chave", "plano", "email"],
    toPath: () => "/admin/licencas",
    primary: (r) => r.chave || "—",
    secondary: (r) => [r.plano, r.email].filter(Boolean).join(" · "),
  },
  {
    kind: "Pedido",
    emoji: "🧾",
    table: "pagamentos",
    fields: ["cliente_email", "status"],
    toPath: () => "/admin/pagamentos",
    primary: (r) => r.cliente_email || `#${r.id?.toString().slice(0, 8)}`,
    secondary: (r) => r.status,
  },
  {
    kind: "Pack",
    emoji: "📦",
    table: "premium_packs",
    fields: ["nome", "titulo", "slug"],
    toPath: () => "/admin/premium-packs",
    primary: (r) => r.nome || r.titulo || r.slug || "—",
  },
  {
    kind: "Prompt",
    emoji: "✨",
    table: "ai_prompts",
    fields: ["nome", "titulo"],
    toPath: () => "/admin/ai-prompts",
    primary: (r) => r.nome || r.titulo || "—",
  },
  {
    kind: "Agent",
    emoji: "🤖",
    table: "ai_agents",
    fields: ["nome", "titulo"],
    toPath: () => "/admin/ai-agents",
    primary: (r) => r.nome || r.titulo || "—",
  },
  {
    kind: "Produto",
    emoji: "🛒",
    table: "produtos",
    fields: ["nome", "titulo", "slug"],
    toPath: () => "/admin/produtos",
    primary: (r) => r.nome || r.titulo || r.slug || "—",
  },
];

function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const dq = useDebounced(q.trim(), 250);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ⌘K / Ctrl+K → foca busca
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!dq || dq.length < 2) {
        setHits([]);
        return;
      }
      setLoading(true);
      const results = await Promise.all(
        SOURCES.map(async (s) => {
          try {
            const or = s.fields.map((f) => `${f}.ilike.%${dq}%`).join(",");
            const cols = ["id", ...s.fields].join(",");
            const { data } = await (supabase as any)
              .from(s.table)
              .select(cols)
              .or(or)
              .limit(4);
            return (data ?? []).map(
              (row: any): Hit => ({
                kind: s.kind,
                emoji: s.emoji,
                primary: s.primary(row),
                secondary: s.secondary?.(row) ?? undefined,
                to: s.toPath(row),
              }),
            );
          } catch {
            return [] as Hit[];
          }
        }),
      );
      if (cancelled) return;
      setHits(results.flat().slice(0, 24));
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [dq]);

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 justify-center">
      <label className="relative flex h-10 w-full max-w-[560px] items-center rounded-full border border-border/70 bg-surface/60 pl-9 pr-3 backdrop-blur-xl transition-colors focus-within:border-primary/50 md:h-12 md:pl-11 md:pr-14">
        <Search
          className="absolute left-3 size-4 text-muted-foreground md:left-4"
          strokeWidth={2}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          placeholder="Buscar clientes, licenças, pedidos, packs…"
          className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <kbd className="absolute right-3 hidden items-center gap-1 rounded-md border border-border/60 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘ K
        </kbd>
      </label>

      {open && q.trim().length >= 2 && (
        <div
          className={cn(
            "glass-strong absolute left-1/2 top-full z-50 mt-2 w-[min(680px,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border/60 shadow-2xl",
          )}
        >
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 text-[11px] text-muted-foreground">
            <span>Resultados</span>
            {loading && <Loader2 className="size-3 animate-spin" />}
          </div>
          <div className="max-h-[420px] overflow-auto">
            {hits.length === 0 && !loading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para “{q}”.
              </p>
            ) : (
              <ul>
                {hits.map((h, i) => (
                  <li key={i}>
                    <Link
                      to={h.to as never}
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                      }}
                      className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 text-sm transition-colors last:border-0 hover:bg-white/[0.04]"
                    >
                      <span aria-hidden className="text-lg leading-none">
                        {h.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{h.primary}</div>
                        {h.secondary && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {h.secondary}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-border/60 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {h.kind}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
