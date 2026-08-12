import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  Copy,
  Check,
  X,
  Tag,
  Crown,
  Heart,
  Eye,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  Wand2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { copyText } from "@/lib/clipboard";
import { SmartCover } from "@/components/SmartCover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PROMPT_LIBRARY_CATEGORIES,
  PROMPT_LIBRARY_SUBCATEGORIES,
  PROMPT_STATUS_OPTIONS,
  PROMPT_LEVELS,
  PROMPT_COMPATIBILITY,
  formatPromptNumber,
} from "@/lib/prompts-library/catalog";
import {
  listPromptsPaged,
  listPromptCategoriesTree,
  listRecommendations,
  listFavoriteIds,
  toggleFavorite as toggleFavoriteFn,
  recordPromptUsage,
  listRecentPromptIds,
  type LibraryPrompt,
} from "@/lib/prompts-library.functions";
import { getPromptDetail } from "@/lib/prompts.functions";
import { useIsAuthed } from "@/hooks/useIsAuthed";
import { downloadItemAsHtml } from "@/lib/download-item";
import { Download } from "lucide-react";

type SortKey = "recent" | "popular" | "most_used" | "most_downloaded" | "numero" | "az" | "za";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Mais recentes",
  popular: "Destaques",
  most_used: "Mais utilizados",
  most_downloaded: "Mais baixados",
  numero: "Por número",
  az: "A — Z",
  za: "Z — A",
};

type Filters = {
  search: string;
  categoria?: string;
  subcategoria?: string;
  compatibilidade: string[];
  status: string[];
  nivel?: string;
  sort: SortKey;
  view: "all" | "favorites" | "recent";
};

const DEFAULT_FILTERS: Filters = {
  search: "",
  compatibilidade: [],
  status: [],
  sort: "recent",
  view: "all",
};

const PAGE_SIZE = 48;

export function PromptsLibraryShell() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const isAuthed = useIsAuthed();

  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Permite reabrir o modal com outro prompt (usado por "Você também pode gostar")
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (typeof id === "string" && id) setOpenId(id);
    };
    window.addEventListener("open-prompt", onOpen as EventListener);
    return () => window.removeEventListener("open-prompt", onOpen as EventListener);
  }, []);

  const listFn = useServerFn(listPromptsPaged);
  const treeFn = useServerFn(listPromptCategoriesTree);
  const favIdsFn = useServerFn(listFavoriteIds);
  const recentFn = useServerFn(listRecentPromptIds);

  const { data: tree } = useQuery({
    queryKey: ["prompts-library", "tree"],
    queryFn: () => treeFn(),
    staleTime: 5 * 60_000,
  });

  const { data: favIds } = useQuery({
    queryKey: ["prompts-library", "fav-ids"],
    queryFn: () => favIdsFn(),
    enabled: !!isAuthed,
    staleTime: 60_000,
  });

  const { data: recentIds } = useQuery({
    queryKey: ["prompts-library", "recent-ids"],
    queryFn: () => recentFn({ data: { limit: 36 } }),
    enabled: !!isAuthed && filters.view === "recent",
    staleTime: 30_000,
  });

  const filterIds =
    filters.view === "favorites"
      ? (favIds ?? [])
      : filters.view === "recent"
        ? (recentIds ?? [])
        : undefined;

  const queryEnabled = filters.view === "all" || (filterIds && filterIds.length > 0);
  const emptyFromIds = filters.view !== "all" && filterIds && filterIds.length === 0;

  const { data: page1, isFetching } = useQuery({
    queryKey: ["prompts-library", "page", { ...filters, page, filterIds }],
    queryFn: () =>
      listFn({
        data: {
          page,
          pageSize: PAGE_SIZE,
          search: filters.search,
          categoria: filters.categoria,
          subcategoria: filters.subcategoria,
          compatibilidade: filters.compatibilidade.length ? filters.compatibilidade : undefined,
          status: filters.status.length ? filters.status : undefined,
          nivel: filters.nivel,
          sort: filters.sort,
          ids: filterIds,
        },
      }),
    enabled: !!queryEnabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const items = emptyFromIds ? [] : (page1?.items ?? []);
  const total = emptyFromIds ? 0 : (page1?.total ?? 0);
  const hasMore = items.length > 0 && page * PAGE_SIZE < total;

  const favSet = useMemo(() => new Set(favIds ?? []), [favIds]);

  return (
    <div data-ai-theme="prompts" className="ai-module relative w-full">
      <Toaster />

      {/* Hero */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">PROMPTS</h1>
          <p className="text-white/55 text-sm mt-1">
            Catálogo Premium de Prompts Profissionais.
            {typeof total === "number" && total > 0 ? (
              <span className="ml-1 text-white/40">
                · {total.toLocaleString("pt-BR")} cadastrados
              </span>
            ) : null}
          </p>
        </div>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por título, número, autor, tag..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-9 bg-white/[0.04] border-white/10 focus-visible:border-white/30 focus-visible:ring-white/10"
          />
        </div>
      </div>

      <main className="w-full min-w-0 pb-28">
        <Toolbar
          filters={filters}
          onChange={setFilters}
          total={total}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
        />

        {showFilters && <FilterPanel filters={filters} onChange={setFilters} />}

        {isFetching && !page1 ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <EmptyState filters={filters} />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
              {items.map((p) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  favorited={favSet.has(p.id)}
                  onOpen={() => setOpenId(p.id)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="grid place-items-center pt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage((n) => n + 1)}
                  disabled={isFetching}
                  className="gap-2 border-ai-300/30 text-ai-100"
                >
                  {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Carregar mais ({items.length}/{total})
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <CategoryDock
        tree={tree ?? []}
        filters={filters}
        onChange={setFilters}
        favCount={favIds?.length ?? 0}
      />

      {openId && (
        <PromptModal id={openId} favorited={favSet.has(openId)} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

/* ============== Toolbar ============== */

function Toolbar({
  filters,
  onChange,
  total,
  showFilters,
  onToggleFilters,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  total: number;
  showFilters: boolean;
  onToggleFilters: () => void;
}) {
  const activeChips: Array<{ k: string; label: string; onClear: () => void }> = [];
  if (filters.categoria)
    activeChips.push({
      k: "cat",
      label: filters.categoria,
      onClear: () => onChange({ ...filters, categoria: undefined, subcategoria: undefined }),
    });
  if (filters.subcategoria)
    activeChips.push({
      k: "sub",
      label: filters.subcategoria,
      onClear: () => onChange({ ...filters, subcategoria: undefined }),
    });
  if (filters.nivel)
    activeChips.push({
      k: "lvl",
      label: filters.nivel,
      onClear: () => onChange({ ...filters, nivel: undefined }),
    });
  for (const s of filters.status)
    activeChips.push({
      k: `st-${s}`,
      label: s,
      onClear: () => onChange({ ...filters, status: filters.status.filter((x) => x !== s) }),
    });
  for (const c of filters.compatibilidade)
    activeChips.push({
      k: `cp-${c}`,
      label: c,
      onClear: () =>
        onChange({ ...filters, compatibilidade: filters.compatibilidade.filter((x) => x !== c) }),
    });

  return (
    <div className="sticky top-2 z-10 bg-[#06060a]/90 backdrop-blur rounded-xl py-2 mb-3 flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onToggleFilters}
        className="gap-1.5 border-ai-300/25 text-ai-100/80"
      >
        <Filter className="w-3.5 h-3.5" /> Filtros
      </Button>
      <select
        value={filters.sort}
        onChange={(e) => onChange({ ...filters, sort: e.target.value as SortKey })}
        className="h-9 px-3 rounded-md bg-black/60 border border-ai-300/25 text-ai-50 text-sm"
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k} className="bg-black">
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
      <div className="text-[11px] text-ai-200/50 ml-auto">
        {total.toLocaleString("pt-BR")} resultado{total === 1 ? "" : "s"}
      </div>
      {activeChips.length > 0 && (
        <div className="w-full flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <button
              key={c.k}
              onClick={c.onClear}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-ai-300/30 bg-ai-500/10 text-ai-100 hover:bg-ai-500/20"
            >
              {c.label} <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPanel({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  function toggle(list: string[], v: string) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }
  return (
    <div className="mb-4 rounded-xl border border-ai-300/20 bg-black/40 p-4 space-y-4">
      <FilterGroup title="Status">
        {PROMPT_STATUS_OPTIONS.map((s) => (
          <Chip
            key={s}
            active={filters.status.includes(s)}
            onClick={() => onChange({ ...filters, status: toggle(filters.status, s) })}
          >
            {s}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Compatibilidade">
        {PROMPT_COMPATIBILITY.map((s) => (
          <Chip
            key={s}
            active={filters.compatibilidade.includes(s)}
            onClick={() =>
              onChange({ ...filters, compatibilidade: toggle(filters.compatibilidade, s) })
            }
          >
            {s}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Nível">
        {PROMPT_LEVELS.map((s) => (
          <Chip
            key={s}
            active={filters.nivel === s}
            onClick={() => onChange({ ...filters, nivel: filters.nivel === s ? undefined : s })}
          >
            {s}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.28em] text-ai-200/60 font-bold mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] border transition",
        active
          ? "bg-ai-500/20 border-ai-300/60 text-ai-50"
          : "bg-black/60 border-ai-300/20 text-ai-100/65 hover:border-ai-300/40 hover:text-ai-50",
      )}
    >
      {children}
    </button>
  );
}

/* ============== Card ============== */

function PromptCard({
  prompt,
  favorited,
  onOpen,
}: {
  prompt: LibraryPrompt;
  favorited: boolean;
  onOpen: () => void;
}) {
  const qc = useQueryClient();
  const isAuthed = useIsAuthed();
  const toggleFn = useServerFn(toggleFavoriteFn);
  const recordFn = useServerFn(recordPromptUsage);
  const detailFn = useServerFn(getPromptDetail);

  const [copied, setCopied] = useState(false);

  const favMutation = useMutation({
    mutationFn: () => toggleFn({ data: { promptId: prompt.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompts-library", "fav-ids"] });
    },
    onError: () => toast.error("Faça login para favoritar"),
  });

  async function copyContent(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const detail = await detailFn({ data: { id: prompt.id } });
      const ok = await copyText(detail.prompt ?? "");
      if (!ok) throw new Error("copy failed");
      setCopied(true);
      toast.success("Prompt copiado!");
      setTimeout(() => setCopied(false), 2000);
      if (isAuthed) {
        try {
          await recordFn({ data: { promptId: prompt.id, action: "copy" } });
        } catch {
          /* noop */
        }
      }
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  const cover =
    (prompt.cover_url && prompt.cover_url.trim()) ||
    `autocover://${encodeURIComponent(prompt.titulo || "Prompt")}`;

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-ai-300/15 bg-black/40 hover:border-ai-300/40 transition cursor-pointer"
      onClick={onOpen}
    >
      <div className="relative aspect-[4/5] bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
        <SmartCover
          capaUrl={cover}
          title={prompt.titulo}
          alt={prompt.titulo}
          className="absolute inset-0 h-full w-full"
          rounded=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border border-ai-300/30 text-ai-100">
            {formatPromptNumber(prompt.numero)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              favMutation.mutate();
            }}
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition",
              favorited
                ? "bg-ai-500 text-white"
                : "bg-black/60 text-ai-200/80 hover:bg-ai-500/40 hover:text-white",
            )}
            aria-label="Favoritar"
          >
            <Heart className={cn("w-3 h-3", favorited && "fill-current")} />
          </button>
        </div>
        {prompt.status && prompt.status.length > 0 && (
          <div className="absolute bottom-12 left-2 flex flex-wrap gap-1">
            {prompt.status.slice(0, 2).map((s) => (
              <span
                key={s}
                className={cn(
                  "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  s === "Elite"
                    ? "bg-gradient-to-r from-amber-400 to-ai-500 text-black"
                    : s === "Premium"
                      ? "bg-ai-500/90 text-white"
                      : s === "Novo"
                        ? "bg-emerald-500/90 text-black"
                        : s === "Popular"
                          ? "bg-amber-500/90 text-black"
                          : "bg-blue-500/90 text-white",
                )}
              >
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 p-2.5 space-y-1">
          <div className="text-[9px] uppercase tracking-widest text-ai-200/70 truncate">
            {prompt.categoria}
            {prompt.subcategoria ? ` • ${prompt.subcategoria}` : ""}
          </div>
          <div className="text-[12px] font-semibold text-white line-clamp-2 leading-tight">
            {prompt.titulo}
          </div>
        </div>
      </div>

      <div className="px-2.5 py-2 flex items-center justify-between border-t border-ai-300/10">
        <div className="text-[10px] text-ai-200/60 truncate flex-1">
          {prompt.nivel}
          {prompt.compatibilidade && prompt.compatibilidade.length > 0 && (
            <span className="text-ai-200/40">
              {" "}
              • {prompt.compatibilidade.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
        <button
          onClick={copyContent}
          className="p-1.5 rounded text-ai-200/80 hover:text-ai-50 hover:bg-ai-500/10"
          title="Copiar"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="p-1.5 rounded text-ai-200/80 hover:text-ai-50 hover:bg-ai-500/10"
          title="Abrir"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ============== Skeleton + Empty ============== */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-ai-300/10 bg-black/40">
          <div className="aspect-[4/5] bg-gradient-to-br from-zinc-900 to-black animate-pulse" />
          <div className="p-2.5 space-y-2">
            <div className="h-2 w-1/3 bg-ai-300/10 rounded animate-pulse" />
            <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filters }: { filters: Filters }) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border border-ai-300/15 bg-black/30">
      <Wand2 className="w-10 h-10 text-ai-300/60 mx-auto mb-3" />
      <h3 className="text-ai-100 font-semibold mb-1">
        {filters.view === "favorites"
          ? "Nenhum favorito ainda"
          : filters.view === "recent"
            ? "Sem histórico recente"
            : "Nenhum prompt encontrado"}
      </h3>
      <p className="text-ai-200/55 text-sm">Ajuste os filtros ou tente outra categoria.</p>
    </div>
  );
}

/* ============== Modal ============== */

function PromptModal({
  id,
  favorited,
  onClose,
}: {
  id: string;
  favorited: boolean;
  onClose: () => void;
}) {
  const detailFn = useServerFn(getPromptDetail);
  const recsFn = useServerFn(listRecommendations);
  const recordFn = useServerFn(recordPromptUsage);
  const toggleFn = useServerFn(toggleFavoriteFn);
  const qc = useQueryClient();
  const isAuthed = useIsAuthed();
  const [copied, setCopied] = useState(false);
  const opened = useRef(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["prompt-detail", id],
    queryFn: () => detailFn({ data: { id } }),
  });
  const { data: recs } = useQuery({
    queryKey: ["prompt-recs", id],
    queryFn: () => recsFn({ data: { id, limit: 8 } }),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (item && !opened.current && isAuthed) {
      opened.current = true;
      recordFn({ data: { promptId: id, action: "open" } }).catch(() => {
        /* noop */
      });
    }
  }, [item, id, isAuthed, recordFn]);

  async function copy() {
    if (!item?.prompt) return;
    try {
      const ok = await copyText(item.prompt);
      if (!ok) throw new Error("copy failed");
      setCopied(true);
      toast.success("Prompt copiado!");
      setTimeout(() => setCopied(false), 2000);
      if (isAuthed) {
        try {
          await recordFn({ data: { promptId: id, action: "copy" } });
        } catch {
          /* noop */
        }
      }
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  async function fav() {
    try {
      await toggleFn({ data: { promptId: id } });
      qc.invalidateQueries({ queryKey: ["prompts-library", "fav-ids"] });
    } catch {
      toast.error("Faça login para favoritar");
    }
  }

  // Status escalar no destino: normaliza para array para render.
  const itemStatusArr =
    item &&
    typeof (item as { status?: unknown }).status === "string" &&
    (item as { status: string }).status.trim()
      ? [(item as { status: string }).status.trim()]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md grid place-items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl border border-ai-300/25 bg-gradient-to-b from-[#0a0608] to-[#06060a] shadow-[0_40px_120px_-20px_rgba(225,29,72,0.5)]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/60 border border-ai-300/20 text-ai-100/70 hover:text-ai-50"
        >
          <X className="w-4 h-4" />
        </button>

        {isLoading || !item ? (
          <div className="h-72 grid place-items-center">
            <Loader2 className="w-6 h-6 text-ai-300 animate-spin" />
          </div>
        ) : (
          <>
            <div className="relative aspect-[21/9] overflow-hidden bg-gradient-to-br from-black to-zinc-900 border-b border-ai-300/10">
              <SmartCover
                capaUrl={
                  typeof item.cover_url === "string" && item.cover_url.trim()
                    ? item.cover_url
                    : `autocover://${encodeURIComponent(item.titulo)}`
                }
                title={item.titulo}
                alt={item.titulo}
                className="absolute inset-0 h-full w-full"
                rounded=""
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0608] via-transparent to-transparent" />
            </div>

            <div className="px-6 sm:px-8 pt-6 pb-3 border-b border-ai-300/10">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-ai-300/80 font-bold mb-2">
                <span className="font-mono bg-black/60 border border-ai-300/20 rounded px-1.5 py-0.5">
                  {formatPromptNumber(item.numero)}
                </span>
                <span>{item.categoria}</span>
                {item.subcategoria && <span>• {item.subcategoria}</span>}
                {itemStatusArr.map((s) => (
                  <span
                    key={s}
                    className="px-1.5 py-0.5 rounded bg-ai-500/20 text-ai-50 border border-ai-300/30 normal-case tracking-normal"
                  >
                    {s}
                  </span>
                ))}
                {item.destaque && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-ai-300 to-red-500 text-black font-black tracking-widest normal-case">
                    <Crown className="w-2.5 h-2.5" /> Destaque
                  </span>
                )}
              </div>
              <h2
                className="text-2xl sm:text-3xl font-light leading-tight"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
              >
                <span className="bg-gradient-to-b from-ai-100 via-ai-200 to-red-400 bg-clip-text text-transparent">
                  {item.titulo}
                </span>
              </h2>
              {item.descricao && <p className="mt-2 text-sm text-ai-100/60">{item.descricao}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-ai-200/60">
                {item.autor && (
                  <span>
                    por <strong className="text-ai-100">{item.autor}</strong>
                  </span>
                )}
                {item.nivel && <span>• {item.nivel}</span>}
                {item.versao && <span>• v{item.versao}</span>}
              </div>
              {Array.isArray(item.tags) && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-ai-300/20 bg-ai-500/[0.05] text-ai-200/80"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 sm:px-8 py-5 overflow-y-auto flex-1 space-y-5">
              {item.descricao_completa && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-ai-200/60 font-bold mb-2">
                    Descrição
                  </div>
                  <p className="text-sm leading-relaxed text-ai-50/85 whitespace-pre-wrap">
                    {item.descricao_completa}
                  </p>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-ai-200/60 font-bold mb-2">
                  Prompt completo
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-ai-50/90 bg-black/60 border border-ai-300/15 rounded-xl p-4 max-h-[40vh] overflow-y-auto min-h-[80px]">
                  {item.prompt}
                </pre>
              </div>

              {recs && recs.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-ai-200/60 font-bold mb-2">
                    Você também pode gostar
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {recs.slice(0, 4).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onClose();
                          setTimeout(
                            () =>
                              window.dispatchEvent(
                                new CustomEvent("open-prompt", { detail: r.id }),
                              ),
                            50,
                          );
                        }}
                        className="rounded-lg overflow-hidden border border-ai-300/15 bg-black/40 hover:border-ai-300/40 transition text-left"
                      >
                        <div className="aspect-[4/5] relative">
                          <SmartCover
                            capaUrl={
                              (r.cover_url && r.cover_url.trim()) ||
                              `autocover://${encodeURIComponent(r.titulo)}`
                            }
                            title={r.titulo}
                            alt={r.titulo}
                            className="absolute inset-0 h-full w-full"
                            rounded=""
                          />
                        </div>
                        <div className="p-1.5 text-[11px] text-white line-clamp-2">{r.titulo}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 sm:px-8 py-4 border-t border-ai-300/10 bg-black/40 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <button
                onClick={fav}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold border transition",
                  favorited
                    ? "bg-ai-500 text-white border-ai-400"
                    : "bg-black/60 text-ai-100 border-ai-300/30 hover:border-ai-300/60",
                )}
              >
                <Heart className={cn("w-4 h-4", favorited && "fill-current")} />
                {favorited ? "Favorito" : "Favoritar"}
              </button>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  onClick={() => {
                    if (!item) return;
                    downloadItemAsHtml({
                      titulo: item.titulo,
                      categoria: item.categoria,
                      subcategoria: item.subcategoria,
                      descricao: item.descricao,
                      descricao_completa: item.descricao_completa,
                      prompt: item.prompt,
                      cover_url: item.cover_url,
                      autor: item.autor,
                      versao: item.versao,
                    });
                    toast.success("Download iniciado");
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-black/60 border border-ai-300/40 text-ai-50 text-xs font-bold uppercase tracking-wider hover:border-ai-300/70 hover:bg-ai-500/10 transition"
                >
                  <Download className="w-4 h-4" /> Baixar
                </button>
                <button
                  onClick={copy}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-ai-400 via-red-500 to-ai-600 text-black text-sm font-black uppercase tracking-wider shadow-[0_0_30px_-8px_rgba(225,29,72,0.8)] hover:brightness-110 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar Prompt
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============== CategoryDock (bottom floating dock) ============== */

function CategoryDock({
  tree,
  filters,
  onChange,
  favCount,
}: {
  tree: Array<{ categoria: string; total: number; subs: { nome: string; count: number }[] }>;
  filters: Filters;
  onChange: (f: Filters) => void;
  favCount: number;
}) {
  const [openCats, setOpenCats] = useState(false);

  const categories = useMemo(() => {
    const seen = new Set<string>(PROMPT_LIBRARY_CATEGORIES as readonly string[]);
    const extras = tree.map((t) => t.categoria).filter((c) => !seen.has(c));
    return [...PROMPT_LIBRARY_CATEGORIES, ...extras];
  }, [tree]);

  const totalMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tree) m.set(t.categoria, t.total);
    return m;
  }, [tree]);

  const activeView = filters.view;
  const activeCat = filters.categoria;

  return (
    <>
      {openCats && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpenCats(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-24 w-[min(640px,92vw)] max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0716]/95 p-3 backdrop-blur-2xl shadow-[0_30px_80px_-20px_var(--ai-500)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-white/45 font-semibold">
              Categorias
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  onChange({
                    ...filters,
                    categoria: undefined,
                    subcategoria: undefined,
                    view: "all",
                  });
                  setOpenCats(false);
                }}
                className={cn(
                  "text-left px-3 py-2 rounded-lg text-[12px] font-medium border transition",
                  !activeCat && activeView === "all"
                    ? "border-ai-300/60 text-ai-50 bg-ai-500/10"
                    : "border-white/10 text-white/70 bg-white/[0.03] hover:bg-white/[0.06]",
                )}
              >
                Todas
              </button>
              {categories.map((c) => {
                const total = totalMap.get(c) ?? 0;
                const active = activeCat === c;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      onChange({ ...filters, categoria: c, subcategoria: undefined, view: "all" });
                      setOpenCats(false);
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg text-[12px] font-medium border transition",
                      active
                        ? "border-ai-300/60 text-ai-50 bg-ai-500/10"
                        : "border-white/10 text-white/70 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <span className="truncate">{c}</span>
                    {total > 0 && <span className="text-[10px] text-white/40">{total}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 inset-x-0 z-40 flex justify-center px-4">
        <div className="pointer-events-auto relative flex items-center gap-1 rounded-2xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-2xl shadow-[0_20px_60px_-20px_var(--ai-500)]">
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-ai-500/30 via-fuchsia-500/30 to-ai-400/30 blur-xl opacity-70"
          />
          <DockTab
            icon={Sparkles}
            label="Todos"
            active={activeView === "all" && !activeCat}
            onClick={() =>
              onChange({ ...filters, view: "all", categoria: undefined, subcategoria: undefined })
            }
          />
          <DockTab
            icon={Heart}
            label="Favoritos"
            badge={favCount || undefined}
            active={activeView === "favorites"}
            onClick={() =>
              onChange({
                ...filters,
                view: "favorites",
                categoria: undefined,
                subcategoria: undefined,
              })
            }
          />
          <DockTab
            icon={Clock}
            label="Recentes"
            active={activeView === "recent"}
            onClick={() =>
              onChange({
                ...filters,
                view: "recent",
                categoria: undefined,
                subcategoria: undefined,
              })
            }
          />
          <DockTab
            icon={TrendingUp}
            label="Destaques"
            active={filters.sort === "popular"}
            onClick={() => onChange({ ...filters, sort: "popular", view: "all" })}
          />
          <DockTab
            icon={Tag}
            label={activeCat ?? "Categorias"}
            active={!!activeCat || openCats}
            onClick={() => setOpenCats((v) => !v)}
          />
        </div>
      </div>
    </>
  );
}

function DockTab({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition min-w-[64px]",
        active ? "text-ai-100 bg-white/[0.06]" : "text-white/55 hover:text-white",
      )}
    >
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_var(--ai-400)]")} />
      <span className="max-w-[88px] truncate">{label}</span>
      {badge ? (
        <span className="absolute top-0 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
