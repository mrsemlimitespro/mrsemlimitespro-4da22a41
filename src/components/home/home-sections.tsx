/**
 * Seções da Home consumidas do banco (CMS).
 * Cada seção permanece SEMPRE visível — quando não há dados, exibe
 * um Empty State elegante com CTA de cadastro (apenas para admins).
 * Todas usam Supabase realtime para refletir alterações do Admin ao vivo.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

function EmptyState({
  message,
  adminHref,
  adminLabel = "Cadastrar Agora",
}: {
  message: string;
  adminHref?: string;
  adminLabel?: string;
}) {
  const isAdmin = useIsAdmin();
  return (
    <div className="glass flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {isAdmin && adminHref && (
        <a
          href={adminHref}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="size-3.5" />
          {adminLabel}
        </a>
      )}
    </div>
  );
}

function SectionShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">
        <span aria-hidden className="section-title-bar" />
        {title}
      </h2>
      {children}
    </section>
  );
}

const brl = (n: number | null | undefined) =>
  n == null ? "" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useLive<T>(table: string, query: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await query().catch(() => []);
      if (alive) setRows(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`home-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
  return rows;
}

/**
 * ArtImage — exibe a arte por completo, nunca corta.
 * Blur da mesma imagem preenche o fundo quando a proporção diverge.
 */
function ArtImage({
  src,
  alt,
  className,
  rounded = "",
}: {
  src: string;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-black ${rounded} ${className ?? ""}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <div aria-hidden className="absolute inset-0 bg-black/30" />
      <img
        src={src}
        alt={alt}
        className="relative z-10 h-full w-full object-contain"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

/* ============ PROMOÇÕES ============ */
type Promo = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  imagem_url: string | null;
  banner_desktop_url: string | null;
  banner_mobile_url: string | null;
  botao_texto: string | null;
  link: string | null;
  preco_antigo: number | null;
  preco_atual: number | null;
  desconto_percentual: number | null;
  cor: string | null;
  ordem: number | null;
};

export function PromocoesSection() {
  const items = useLive<Promo>("promocoes", async () => {
    const { data } = await supabase
      .from("promocoes")
      .select(
        "id,titulo,subtitulo,descricao,imagem_url,banner_desktop_url,banner_mobile_url,botao_texto,link,preco_antigo,preco_atual,desconto_percentual,cor,ordem",
      )
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    return (data ?? []) as Promo[];
  });

  if (items.length === 0) {
    return (
      <SectionShell title="Promoções ativas">
        <EmptyState message="Nenhuma promoção ativa." adminHref="/admin/promocoes" />
      </SectionShell>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="section-title">
        <span aria-hidden className="section-title-bar" />
        Promoções ativas
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => {
          const img = p.banner_desktop_url || p.imagem_url;
          const color = p.cor ? `var(--brand-${p.cor}, ${p.cor})` : "var(--brand-magenta)";
          return (
            <a
              key={p.id}
              href={p.link || "#"}
              onClick={(e) => !p.link && e.preventDefault()}
              className="glass group relative flex flex-col overflow-hidden rounded-2xl transition-transform hover:scale-[1.01]"
              style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 25%, transparent)` }}
            >
              {img && <ArtImage src={img} alt={p.titulo} className="aspect-[16/9] w-full" />}
              <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">{p.titulo}</h3>
                    {p.subtitulo && <p className="text-xs text-muted-foreground">{p.subtitulo}</p>}
                  </div>
                  {p.desconto_percentual != null && p.desconto_percentual > 0 && (
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      -{Number(p.desconto_percentual).toFixed(0)}%
                    </span>
                  )}
                </div>
                {p.descricao && (
                  <p className="line-clamp-2 text-xs text-muted-foreground/90">{p.descricao}</p>
                )}
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    {p.preco_antigo != null && (
                      <span className="text-xs text-muted-foreground line-through">
                        {brl(p.preco_antigo)}
                      </span>
                    )}
                    {p.preco_atual != null && (
                      <span className="text-lg font-bold" style={{ color }}>
                        {brl(p.preco_atual)}
                      </span>
                    )}
                  </div>
                  {p.botao_texto && p.link && (
                    <span
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ background: color }}
                    >
                      {p.botao_texto}
                    </span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* ============ PLANOS ============ */
type Plano = {
  id: string;
  nome: string;
  preco: number | null;
  creditos_incluidos: number | null;
  duracao_dias: number | null;
  descricao: string | null;
  imagem_url: string | null;
  badge: string | null;
  cor_gradiente: string | null;
  cor: string | null;
  beneficios: unknown;
  botao_texto: string | null;
  link: string | null;
  destaque: boolean | null;
};

export function PlanosSection() {
  const items = useLive<Plano>("planos", async () => {
    const { data } = await supabase
      .from("planos")
      .select(
        "id,nome,preco,creditos_incluidos,duracao_dias,descricao,imagem_url,badge,cor_gradiente,cor,beneficios,botao_texto,link,destaque",
      )
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("preco", { ascending: true });
    return (data ?? []) as Plano[];
  });

  if (items.length === 0) {
    return (
      <SectionShell title="Planos">
        <EmptyState message="Nenhum plano cadastrado." adminHref="/admin/planos" />
      </SectionShell>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="section-title">
        <span aria-hidden className="section-title-bar" />
        Planos
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((p) => {
          const color = p.cor
            ? `var(--brand-${p.cor}, ${p.cor})`
            : p.cor_gradiente
              ? `var(--brand-${p.cor_gradiente})`
              : "var(--brand-violet)";
          const beneficios = Array.isArray(p.beneficios) ? (p.beneficios as string[]) : [];
          return (
            <div
              key={p.id}
              className="glass relative flex flex-col rounded-2xl p-5"
              style={{ boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 30%, transparent)` }}
            >
              {p.badge && (
                <span
                  className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: color }}
                >
                  {p.badge}
                </span>
              )}
              <h3 className="text-base font-semibold">{p.nome}</h3>
              {p.descricao && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
              )}
              <p className="mt-3 text-2xl font-bold" style={{ color }}>
                {brl(p.preco)}
              </p>
              {p.duracao_dias != null && (
                <p className="text-xs text-muted-foreground">
                  {p.duracao_dias >= 3650
                    ? "Vitalício"
                    : p.duracao_dias >= 365
                      ? `${Math.round(p.duracao_dias / 365)} ano(s)`
                      : `${p.duracao_dias} dias`}
                </p>
              )}
              {beneficios.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {beneficios.slice(0, 5).map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
              )}
              {(p.botao_texto || p.link) && (
                <a
                  href={p.link || "#"}
                  onClick={(e) => !p.link && e.preventDefault()}
                  className="mt-4 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white"
                  style={{ background: color }}
                >
                  {p.botao_texto || "Assinar"}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============ PRODUTOS ============ */
export type Produto = {
  id: string;
  nome: string;
  titulo: string | null;
  descricao: string | null;
  categoria: string | null;
  preco: number | null;
  imagem_url: string | null;
  imagens: string[] | null;
  estoque: number | null;
  status: string | null;
  botao_texto: string | null;
  link: string | null;
};

export function galleryOf(p: Produto): string[] {
  const arr = [p.imagem_url, ...((p.imagens ?? []) as string[])]
    .filter((x): x is string => !!x && x.trim().length > 0)
    .map((x) => x.trim());
  return Array.from(new Set(arr));
}


export function ProdutosSection() {
  const items = useLive<Produto>("produtos", async () => {
    const { data } = await supabase
      .from("produtos")
      .select(
        "id,nome,titulo,descricao,categoria,preco,imagem_url,imagens,estoque,status,botao_texto,link",
      )
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    return (data ?? []) as Produto[];
  });

  const [open, setOpen] = useState<Produto | null>(null);

  if (items.length === 0) {
    return (
      <SectionShell title="Produtos">
        <EmptyState message="Nenhum produto cadastrado." adminHref="/admin/loja-produtos" />
      </SectionShell>
    );
  }

  const handleAdquirir = (p: Produto) => {
    if (p.status === "esgotado") return;
    if (p.link) {
      window.open(p.link, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = `/checkout?produto=${encodeURIComponent(p.id)}`;
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="section-title">
        <span aria-hidden className="section-title-bar" />
        Produtos
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((p) => {
          const gallery = galleryOf(p);
          const cover = gallery[0];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              className="glass group flex flex-col overflow-hidden rounded-2xl text-left transition hover:ring-1 hover:ring-primary/40"
            >
              {cover ? (
                <ArtImage
                  src={cover}
                  alt={p.titulo || p.nome}
                  className="aspect-[4/5] w-full sm:aspect-[3/4]"
                />
              ) : (
                <div className="aspect-[3/4] w-full bg-black/60" />
              )}
              <div className="flex flex-col gap-1 p-4">
                {p.categoria && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {p.categoria}
                  </span>
                )}
                <h3 className="text-sm font-semibold">{p.titulo || p.nome}</h3>
                {p.descricao && (
                  <p className="line-clamp-2 text-xs text-muted-foreground/90">{p.descricao}</p>
                )}
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="text-lg font-bold">{brl(p.preco)}</span>
                  {p.status === "esgotado" ? (
                    <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                      ESGOTADO
                    </span>
                  ) : (
                    <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      Ver detalhes
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {open && <ProdutoModal produto={open} onClose={() => setOpen(null)} onBuy={handleAdquirir} />}
    </section>
  );
}

export function ProdutoModal({
  produto,
  onClose,
  onBuy,
}: {
  produto: Produto;
  onClose: () => void;
  onBuy: (p: Produto) => void;
}) {
  const gallery = useMemo(() => galleryOf(produto), [produto]);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = gallery[idx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % Math.max(1, gallery.length));
      if (e.key === "ArrowLeft")
        setIdx((i) => (i - 1 + Math.max(1, gallery.length)) % Math.max(1, gallery.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [gallery.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/80 p-2 backdrop-blur-xl sm:p-4 md:flex md:items-center md:justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      <div
        className="glass-strong relative flex w-full max-w-6xl flex-col rounded-2xl md:max-h-[92vh] md:flex-row md:overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="fixed right-4 top-4 z-30 grid size-9 place-items-center rounded-full bg-black/70 text-white transition hover:bg-black/90 md:absolute md:right-3 md:top-3"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>

        {/* Área da imagem */}
        <div className="relative flex flex-1 flex-col bg-black md:min-h-0 md:overflow-hidden">
          <div
            className={`relative flex-1 md:overflow-auto ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            onClick={() => setZoom((z) => !z)}
          >
            {current ? (
              <>
                <img
                  src={current}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
                />
                <div className="relative z-10 flex w-full items-center justify-center p-2 md:h-full md:min-h-[70vh]">
                  <img
                    src={current}
                    alt={produto.titulo || produto.nome}
                    className={
                      zoom
                        ? "max-w-none object-contain transition-transform"
                        : "h-auto w-full object-contain transition-transform md:max-h-full md:max-w-full"
                    }
                    style={zoom ? { transform: "scale(2)", transformOrigin: "center" } : undefined}
                    draggable={false}
                  />
                </div>
              </>
            ) : (
              <div className="grid h-full min-h-[40vh] place-items-center text-muted-foreground">
                Sem imagem
              </div>
            )}

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx((i) => (i - 1 + gallery.length) % gallery.length);
                    setZoom(false);
                  }}
                  className="absolute left-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx((i) => (i + 1) % gallery.length);
                    setZoom(false);
                  }}
                  className="absolute right-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Próxima"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}

            <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
              {zoom ? <ZoomOut className="size-3.5" /> : <ZoomIn className="size-3.5" />}
              {zoom ? "Toque para reduzir" : "Toque para ampliar"}
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-black/60 p-2">
              {gallery.map((g, i) => (
                <button
                  key={g + i}
                  type="button"
                  onClick={() => {
                    setIdx(i);
                    setZoom(false);
                  }}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                    i === idx
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-white/10 opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Imagem ${i + 1}`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" draggable={false} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Painel de informações */}
        <div className="flex w-full flex-col gap-3 p-6 md:w-[380px] md:overflow-y-auto md:border-l md:border-white/10">
          {produto.categoria && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {produto.categoria}
            </span>
          )}
          <h3 className="text-2xl font-bold">{produto.titulo || produto.nome}</h3>
          {produto.descricao && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {produto.descricao}
            </p>
          )}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pb-[env(safe-area-inset-bottom)] pt-4 md:mt-auto md:pb-4">
            <span className="text-2xl font-bold">{brl(produto.preco)}</span>
            {produto.status === "esgotado" ? (
              <span className="rounded-md bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400">
                ESGOTADO
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onBuy(produto)}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {produto.botao_texto || "Adquirir"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ BANNER CARROSSEL DE PRODUTOS (HOME) ============ */
export function ProdutosBannerCarousel() {
  const items = useLive<Produto>("produtos", async () => {
    const { data } = await supabase
      .from("produtos")
      .select(
        "id,nome,titulo,descricao,categoria,preco,imagem_url,imagens,estoque,status,botao_texto,link",
      )
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    return (data ?? []) as Produto[];
  });

  const withImage = items.filter((p) => galleryOf(p).length > 0);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState<Produto | null>(null);

  useEffect(() => {
    if (withImage.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % withImage.length), 6000);
    return () => clearInterval(t);
  }, [withImage.length]);

  if (withImage.length === 0) {
    return (
      <SectionShell title="Banners">
        <EmptyState message="Nenhum banner cadastrado." adminHref="/admin/loja-produtos" />
      </SectionShell>
    );
  }
  const active = withImage[idx % withImage.length];
  const cover = galleryOf(active)[0];

  return (
    <section className="space-y-3">
      <div
        className="glass-strong relative overflow-hidden rounded-2xl"
        style={{
          boxShadow:
            "0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent), 0 20px 80px -30px color-mix(in oklab, var(--brand-magenta) 60%, transparent)",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(active)}
          className="group relative block w-full text-left"
        >
          <ArtImage
            src={cover}
            alt={active.titulo || active.nome}
            className="aspect-[21/9] w-full sm:aspect-[21/8]"
          />
          <div
            className="pointer-events-none absolute inset-0 z-20"
            style={{
              background:
                "linear-gradient(180deg, transparent 40%, color-mix(in oklab, black 75%, transparent) 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-4 p-4 sm:p-6">
            <div className="min-w-0">
              {active.categoria && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  {active.categoria}
                </span>
              )}
              <h3 className="truncate text-xl font-bold text-white sm:text-2xl">
                {active.titulo || active.nome}
              </h3>
              {active.preco != null && (
                <p className="text-sm font-semibold text-white/85">{brl(active.preco)}</p>
              )}
            </div>
            <span className="hidden shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg sm:inline-block">
              Ver detalhes
            </span>
          </div>
        </button>

        {withImage.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + withImage.length) % withImage.length)}
              className="absolute left-3 top-1/2 z-30 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % withImage.length)}
              className="absolute right-3 top-1/2 z-30 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
              aria-label="Próximo"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">
              {withImage.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {open && (
        <ProdutoModal
          produto={open}
          onClose={() => setOpen(null)}
          onBuy={(p) => {
            if (p.link) window.open(p.link, "_blank", "noopener,noreferrer");
            else window.location.href = `/checkout?produto=${encodeURIComponent(p.id)}`;
          }}
        />
      )}
    </section>
  );
}

/* ============ PROPAGANDAS ============ */
type Propaganda = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  texto: string | null;
  imagem_url: string | null;
  imagem_desktop_url: string | null;
  imagem_mobile_url: string | null;
  botao_texto: string | null;
  link: string | null;
  posicao: string | null;
};

export function PropagandasSection({ posicao = "home" }: { posicao?: string }) {
  const items = useLive<Propaganda>("propagandas", async () => {
    const { data } = await supabase
      .from("propagandas")
      .select(
        "id,titulo,subtitulo,texto,imagem_url,imagem_desktop_url,imagem_mobile_url,botao_texto,link,posicao",
      )
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    return (data ?? []) as Propaganda[];
  });

  const filtered = items.filter((p) => (p.posicao || "home") === posicao);
  if (filtered.length === 0) {
    return (
      <SectionShell title="Propagandas">
        <EmptyState message="Nenhuma propaganda cadastrada." adminHref="/admin/propagandas" />
      </SectionShell>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((p) => {
        const img = p.imagem_desktop_url || p.imagem_url;
        return (
          <a
            key={p.id}
            href={p.link || "#"}
            onClick={(e) => !p.link && e.preventDefault()}
            className="glass group relative flex overflow-hidden rounded-2xl"
          >
            {img && (
              <ArtImage src={img} alt={p.titulo} className="h-28 w-28 shrink-0" rounded="" />
            )}
            <div className="flex flex-1 flex-col justify-center gap-0.5 p-3">
              <h4 className="text-sm font-semibold">{p.titulo}</h4>
              {p.subtitulo && <p className="text-xs text-muted-foreground">{p.subtitulo}</p>}
              {p.texto && (
                <p className="line-clamp-2 text-xs text-muted-foreground/80">{p.texto}</p>
              )}
              {p.botao_texto && p.link && (
                <span className="mt-1 inline-block w-fit rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  {p.botao_texto}
                </span>
              )}
            </div>
          </a>
        );
      })}
    </section>
  );
}

/* ============ VÍDEOS ============ */
type VideoRow = {
  id: string;
  titulo: string | null;
  url: string;
  thumbnail_url: string | null;
  descricao: string | null;
  created_at: string;
};

export function VideosSection() {
  const items = useLive<VideoRow>("videos", async () => {
    const { data } = await supabase
      .from("videos")
      .select("id,titulo,url,thumbnail_url,descricao,created_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as VideoRow[];
  });

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= items.length) setIdx(0);
  }, [items.length, idx]);

  if (items.length === 0) {
    return (
      <SectionShell title="Vídeos">
        <EmptyState message="Nenhum vídeo disponível." adminHref="/admin/videos" />
      </SectionShell>
    );
  }

  const active = items[idx % items.length];
  const isEmbed = /youtube\.com|youtu\.be|vimeo\.com/i.test(active.url);
  const embedUrl = (() => {
    if (!isEmbed) return active.url;
    const m = active.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&loop=1&playlist=${m[1]}&controls=1&modestbranding=1&playsinline=1`;
    const vm = active.url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=0`;
    return active.url;
  })();

  return (
    <SectionShell title="Vídeos">
      <div
        className="glass-strong relative overflow-hidden rounded-2xl"
        style={{
          boxShadow:
            "0 0 0 1px color-mix(in oklab, var(--primary) 25%, transparent), 0 20px 60px -30px color-mix(in oklab, var(--brand-violet) 60%, transparent)",
        }}
      >
        <div className="relative aspect-video w-full bg-black">
          {isEmbed ? (
            <iframe
              key={active.id}
              src={embedUrl}
              title={active.titulo || "Vídeo"}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              key={active.id}
              src={active.url}
              poster={active.thumbnail_url || undefined}
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
          )}
        </div>

        {(active.titulo || active.descricao) && (
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              {active.titulo && (
                <h3 className="truncate text-sm font-semibold">{active.titulo}</h3>
              )}
              {active.descricao && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{active.descricao}</p>
              )}
            </div>
          </div>
        )}

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
              className="absolute left-3 top-[calc(50%-1.5rem)] z-30 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % items.length)}
              className="absolute right-3 top-[calc(50%-1.5rem)] z-30 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
              aria-label="Próximo"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border transition ${
                i === idx
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-white/10 opacity-70 hover:opacity-100"
              }`}
              aria-label={v.titulo || `Vídeo ${i + 1}`}
            >
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-black/60 text-[10px] text-muted-foreground">
                  Vídeo
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
