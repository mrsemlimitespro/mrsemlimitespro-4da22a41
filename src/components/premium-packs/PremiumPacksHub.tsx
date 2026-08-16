import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  PackageOpen,
  Search,
  Sparkles,
  Heart,
  Share2,
  Download,
  Files,
  Clock,
  Flame,
  Star,
  Rocket,
  TrendingUp,
  RefreshCcw,
  ArrowUpDown,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { listPremiumPacks } from "@/lib/premium-packs/packs.functions";
import type { PremiumPack, PremiumPackSort } from "@/lib/premium-packs/types";
import { formatBytes, formatRelative } from "@/lib/premium-packs/format";
import { Input } from "@/components/ui/input";
import { AICard, AIPill } from "@/components/ai-modules/AIModuleShell";
import { useNavigate } from "@tanstack/react-router";
import { useLocalFavorites } from "@/hooks/useLocalFavorites";
import { cn } from "@/lib/utils";
import { PackQuickActions, buildPackPublicUrl } from "./PackQuickActions";
import { PackCover } from "./PackCover";

const PAGE = 24;

const SORTS: {
  key: PremiumPackSort;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "recentes", label: "Mais recentes", Icon: Sparkles },
  { key: "atualizados", label: "Atualizados", Icon: RefreshCcw },
  { key: "baixados", label: "Mais baixados", Icon: Download },
  { key: "populares", label: "Mais populares", Icon: TrendingUp },
  { key: "nome", label: "Nome (A-Z)", Icon: ArrowUpDown },
];

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n ?? 0);
}

export function PremiumPacksHub({ onBack }: { onBack?: () => void }) {
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<PremiumPackSort>("recentes");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const navigate = useNavigate();
  const openPack = (p: PremiumPack) => navigate({ to: "/packs/$slug", params: { slug: p.slug } });
  const qDebounced = useDebounced(q);

  const { isFav, toggle } = useLocalFavorites("premium_pack");

  const list = useServerFn(listPremiumPacks);
  const query = useInfiniteQuery({
    queryKey: ["premium-packs", qDebounced, categoria, sort],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      list({
        data: {
          q: qDebounced || undefined,
          categoria: categoria || undefined,
          sort,
          offset: pageParam as number,
          limit: PAGE,
        },
      }),
    getNextPageParam: (last) => last.nextOffset,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const rows = useMemo(() => (query.data?.pages ?? []).flatMap((p) => p.rows), [query.data]);
  const total = query.data?.pages?.[0]?.total ?? 0;

  const totalDownloads = useMemo(
    () => rows.reduce((acc, r) => acc + (r.downloads ?? 0), 0),
    [rows],
  );

  const lastUpdate = useMemo(() => {
    if (!rows.length) return null;
    return rows
      .map((r) => r.ultima_atualizacao || r.updated_at)
      .filter(Boolean)
      .sort()
      .pop() as string | undefined;
  }, [rows]);

  const categorias = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      if (!r.categoria) return;
      m.set(r.categoria, (m.get(r.categoria) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => (r.tags ?? []).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tag && !(r.tags ?? []).includes(tag)) return false;
      if (onlyFavs && !isFav(r.id)) return false;
      return true;
    });
  }, [rows, tag, onlyFavs, isFav]);

  const destaques = useMemo(() => filtered.filter((p) => p.destaque).slice(0, 6), [filtered]);
  const novidades = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
        .slice(0, 6),
    [filtered],
  );
  const maisBaixados = useMemo(
    () => [...filtered].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)).slice(0, 6),
    [filtered],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !query.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [query]);

  const handleShareHub = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Central de Packs Premium", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      }
    } catch {
      /* user cancelled */
    }
  };

  const hasFilters = Boolean(q || categoria || tag || onlyFavs || sort !== "recentes");

  return (
    <div
      data-ai-theme="packs"
      className="ai-module relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 animate-fade-in"
    >
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white/85 hover:bg-white/[0.08] transition"
        >
          ← Voltar ao Dashboard
        </button>
      )}
      {/* HERO */}
      <div className="relative mt-2 mb-6 overflow-hidden rounded-3xl border border-ai-300/15 bg-gradient-to-br from-ai-500/[0.08] via-black/60 to-ai-400/[0.04] p-5 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-10 h-64 w-64 rounded-full bg-ai-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-ai-400/20 blur-3xl"
        />

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-ai-300/30 bg-ai-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.26em] text-ai-100">
              <Sparkles className="h-3 w-3" />
              MR Sem Limites · Marketplace
            </div>
            <h1 className="bg-gradient-to-r from-ai-50 via-ai-200 to-ai-300 bg-clip-text text-3xl sm:text-4xl font-bold tracking-tight text-transparent">
              Central de Packs Premium
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-white/60">
              Curadoria com acesso vitalício — busque por categoria, popularidade e atualizações
              recentes.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyFavs((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] transition",
                onlyFavs
                  ? "border-ai-300/60 bg-ai-500/15 text-ai-50 shadow-[0_0_18px_-6px_var(--ai-500)]"
                  : "border-ai-300/20 bg-black/50 text-ai-100/70 hover:border-ai-300/40 hover:text-ai-50",
              )}
              aria-pressed={onlyFavs}
            >
              <Heart className={cn("h-3.5 w-3.5", onlyFavs && "fill-current")} />
              Favoritos
            </button>
            <button
              type="button"
              onClick={handleShareHub}
              className="inline-flex items-center gap-1.5 rounded-full border border-ai-300/20 bg-black/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ai-100/70 hover:border-ai-300/40 hover:text-ai-50 transition"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartilhar
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill icon={PackageOpen} label="Total de packs" value={fmt(total || rows.length)} />
          <StatPill icon={Download} label="Downloads" value={fmt(totalDownloads)} />
          <StatPill icon={Star} label="Em destaque" value={fmt(destaques.length)} />
          <StatPill
            icon={Clock}
            label="Última atualização"
            value={lastUpdate ? formatRelative(lastUpdate) : "—"}
          />
        </div>

        <div className="relative mt-5 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ai-200/60" />
            <Input
              placeholder="Buscar pack por nome, descrição, categoria ou tag..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 bg-white/[0.04] border-ai-300/20 text-white placeholder:text-white/35 focus-visible:border-ai-300/60 focus-visible:ring-ai-500/20"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SORTS.map(({ key, label, Icon }) => (
              <AIPill key={key} active={sort === key} onClick={() => setSort(key)}>
                <Icon className="h-3 w-3" /> {label}
              </AIPill>
            ))}
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      {categorias.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <AIPill active={!categoria} onClick={() => setCategoria(null)}>
            <Sparkles className="h-3 w-3" /> Todas ({fmt(total || rows.length)})
          </AIPill>
          {categorias.map(([c, n]) => (
            <AIPill
              key={c}
              active={categoria === c}
              onClick={() => setCategoria(categoria === c ? null : c)}
            >
              {c} ({n})
            </AIPill>
          ))}
        </div>
      )}

      {/* TAGS */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {allTags.map(([t, n]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] transition",
                tag === t
                  ? "border-ai-300/60 bg-ai-500/15 text-ai-50"
                  : "border-white/10 bg-white/[0.02] text-white/55 hover:border-ai-300/30 hover:text-ai-100",
              )}
            >
              #{t} <span className="text-white/30">{n}</span>
            </button>
          ))}
        </div>
      )}

      {/* LOADING / EMPTY */}
      {query.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[340px] rounded-2xl border border-ai-300/10 bg-gradient-to-br from-white/[0.03] to-transparent animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-ai-300/20 bg-gradient-to-br from-ai-500/[0.05] via-black/40 to-ai-400/[0.03] p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-ai-500/30 to-ai-400/20 shadow-[0_0_30px_-8px_var(--ai-500)]">
            <PackageOpen className="h-7 w-7 text-ai-100" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            {onlyFavs ? "Você ainda não favoritou nenhum pack" : "Nenhum pack encontrado"}
          </h2>
          <p className="mx-auto max-w-md text-sm text-white/55">
            {hasFilters
              ? "Ajuste os filtros ou limpe a busca para ver toda a coleção."
              : "Estrutura preparada para centenas de packs. Os primeiros lançamentos chegam em breve."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setCategoria(null);
                setTag(null);
                setOnlyFavs(false);
                setSort("recentes");
              }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-ai-300/40 bg-ai-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-ai-50 hover:border-ai-300/70"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {!q && !categoria && !tag && !onlyFavs && (
            <div className="space-y-8 mb-10">
              {destaques.length > 0 && (
                <ShowcaseRow
                  title="Packs em destaque"
                  icon={Star}
                  description="Selecionados pela curadoria."
                  items={destaques}
                  onOpen={openPack}
                  isFav={isFav}
                  onFav={(p) => toggle(p.id)}
                />
              )}
              {maisBaixados.length > 0 && (
                <ShowcaseRow
                  title="Mais baixados"
                  icon={Flame}
                  description="Os favoritos da comunidade."
                  items={maisBaixados}
                  onOpen={openPack}
                  isFav={isFav}
                  onFav={(p) => toggle(p.id)}
                />
              )}
              {novidades.length > 0 && (
                <ShowcaseRow
                  title="Novidades & lançamentos"
                  icon={Rocket}
                  description="Recém-chegados à Central."
                  items={novidades}
                  onOpen={openPack}
                  isFav={isFav}
                  onFav={(p) => toggle(p.id)}
                />
              )}
            </div>
          )}

          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Catálogo completo</h2>
              <p className="text-xs text-white/45">
                {fmt(filtered.length)} de {fmt(total || rows.length)} packs visíveis
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <PackTile
                key={p.id}
                pack={p}
                onOpen={openPack}
                isFav={isFav(p.id)}
                onFav={() => toggle(p.id)}
              />
            ))}
          </div>

          <div ref={sentinelRef} className="h-12" />

          {query.hasNextPage && (
            <div className="mt-4 grid place-items-center">
              <button
                type="button"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-full border border-ai-300/40 bg-ai-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-ai-50 hover:border-ai-300/70 transition disabled:opacity-50"
              >
                {query.isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============ Sub-componentes ============ */

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-ai-300/15 bg-black/40 px-3 py-2.5 backdrop-blur transition hover:border-ai-300/40">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ai-500/30 to-ai-400/15 text-ai-100 shadow-[0_0_18px_-8px_var(--ai-500)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
            {label}
          </div>
          <div className="truncate text-base font-semibold text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseRow({
  title,
  icon: Icon,
  description,
  items,
  onOpen,
  isFav,
  onFav,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  items: PremiumPack[];
  onOpen: (p: PremiumPack) => void;
  isFav: (id: string) => boolean;
  onFav: (p: PremiumPack) => void;
}) {
  return (
    <section className="relative">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-ai-500/30 to-ai-400/15 text-ai-100 shadow-[0_0_18px_-8px_var(--ai-500)]">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <span className="rounded-full border border-ai-300/20 bg-ai-500/10 px-2 py-0.5 text-[10px] font-bold text-ai-100">
              {items.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/50">{description}</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x scroll-pl-2 -mx-1 px-1 [scrollbar-width:thin]">
        {items.map((p) => (
          <div key={p.id} className="snap-start shrink-0 w-[280px] sm:w-[300px]">
            <PackTile pack={p} onOpen={onOpen} isFav={isFav(p.id)} onFav={() => onFav(p)} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function PackTile({
  pack,
  onOpen,
  isFav,
  onFav,
  compact = false,
}: {
  pack: PremiumPack;
  onOpen: (p: PremiumPack) => void;
  isFav: boolean;
  onFav: () => void;
  compact?: boolean;
}) {
  const statusLabel =
    pack.status === "ativo" ? "Ativo" : pack.status === "em_breve" ? "Em breve" : "Rascunho";
  const statusTone =
    pack.status === "ativo"
      ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
      : pack.status === "em_breve"
        ? "border-amber-400/40 text-amber-200 bg-amber-500/10"
        : "border-white/15 text-white/55 bg-white/[0.04]";

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildPackPublicUrl(pack);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: pack.nome, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <AICard
      onClick={() => onOpen(pack)}
      className={cn(
        "group cursor-pointer overflow-hidden p-0 flex flex-col",
        compact ? "h-full" : "",
      )}
    >
      <div className="relative overflow-hidden">
        <PackCover
          src={pack.banner_url || pack.capa_url}
          title={pack.nome}
          alt=""
          variant="banner"
          rounded="rounded-none"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
          overlay={
            <>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <span
                className={cn(
                  "pointer-events-auto absolute top-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] backdrop-blur",
                  statusTone,
                )}
              >
                <Sparkles className="h-2.5 w-2.5" /> {statusLabel}
              </span>
              {pack.destaque && (
                <span className="pointer-events-auto absolute top-2 right-2 inline-flex items-center gap-1 rounded-full border border-ai-300/60 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-ai-50 backdrop-blur">
                  <Star className="h-2.5 w-2.5 fill-current" /> Destaque
                </span>
              )}
              <div className="pointer-events-auto absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 transition group-hover:opacity-100">
                <IconChip onClick={handleShare} label="Compartilhar">
                  <Share2 className="h-3.5 w-3.5" />
                </IconChip>
                <IconChip
                  onClick={(e) => {
                    e.stopPropagation();
                    onFav();
                  }}
                  label="Favoritar"
                  active={isFav}
                >
                  <Heart className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                </IconChip>
                <PackQuickActions pack={pack} onOpen={onOpen} />
              </div>
            </>
          }
        />
      </div>

      <div className="relative px-4 -mt-7">
        <div className="w-14">
          <PackCover
            src={pack.capa_url}
            title={pack.nome}
            alt={pack.nome}
            variant="avatar"
            rounded="rounded-xl"
            className="border border-ai-300/40 shadow-[0_8px_28px_-10px_var(--ai-500)]"
          />
        </div>
      </div>

      <div className="px-4 pt-2 pb-4 flex-1 flex flex-col">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-white">
          {pack.nome}
        </h3>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-ai-200/80">
            {pack.categoria}
          </span>
          {pack.versao && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-white/70">
              v{pack.versao}
            </span>
          )}
        </div>
        {pack.descricao_curta && !compact && (
          <p className="mt-2 line-clamp-2 text-xs text-white/60">{pack.descricao_curta}</p>
        )}

        <PackBadges pack={pack} />

        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-white/65">
          <Metric icon={Files} value={fmt(pack.qtd_arquivos)} hint="arquivos" />
          <Metric icon={Download} value={fmt(pack.downloads)} hint="downloads" />
          <Metric icon={Eye} value={fmt(pack.views)} hint="views" />
          <Metric icon={TrendingUp} value={fmt(pack.popularidade)} hint="popular." />
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-white/45">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatRelative(pack.ultima_atualizacao)}
          </span>
          <span>{formatBytes(pack.espaco_bytes)}</span>
        </div>

        {pack.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {pack.tags.slice(0, compact ? 3 : 4).map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/55"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(pack);
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ai-300/40 bg-gradient-to-r from-ai-500/20 to-ai-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-ai-50 transition hover:border-ai-300/70 hover:shadow-[0_0_24px_-8px_var(--ai-500)]"
        >
          Abrir Pack
        </button>
      </div>
    </AICard>
  );
}

function Metric({
  icon: Icon,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  hint: string;
}) {
  return (
    <div className="inline-flex items-center gap-1" title={hint}>
      <Icon className="h-3 w-3 text-ai-200/70" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function PackBadges({ pack }: { pack: PremiumPack }) {
  const now = Date.now();
  const created = pack.created_at ? new Date(pack.created_at).getTime() : 0;
  const updated = pack.ultima_atualizacao
    ? new Date(pack.ultima_atualizacao).getTime()
    : pack.updated_at
      ? new Date(pack.updated_at).getTime()
      : 0;
  const DAY = 86_400_000;
  const isNew = created && now - created <= 14 * DAY;
  const isUpdated = updated && now - updated <= 30 * DAY && Math.abs(updated - created) > DAY;
  if (!isNew && !isUpdated && !pack.destaque) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {isNew && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-100">
          <Sparkles className="h-2.5 w-2.5" /> Novo
        </span>
      )}
      {isUpdated && (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sky-100">
          <RefreshCcw className="h-2.5 w-2.5" /> Atualizado
        </span>
      )}
      {pack.destaque && (
        <span className="inline-flex items-center gap-1 rounded-full border border-ai-300/60 bg-ai-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-ai-50">
          <Star className="h-2.5 w-2.5 fill-current" /> Destaque
        </span>
      )}
    </div>
  );
}

function IconChip({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-full border backdrop-blur transition",
        active
          ? "border-ai-300/60 bg-ai-500/30 text-ai-50"
          : "border-white/15 bg-black/60 text-white/80 hover:border-ai-300/40 hover:text-ai-50",
      )}
    >
      {children}
    </button>
  );
}
