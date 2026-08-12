/**
 * PackDetailPage — página de detalhe pública de um Pack Premium.
 *
 * Adaptação MR Sem Limites (versão enxuta desta fase):
 *  - Hero com banner + capa flutuante + metadados
 *  - Tabs: Sobre · Histórico
 *  - Botão de compartilhar (abre PackShareDialog) e favoritar (localStorage)
 *  - A biblioteca de arquivos (PackViewer + Google Drive tree) será entregue
 *    na Fase 3.7 (integrações externas) — aqui deixamos placeholder claro.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Heart,
  Share2,
  Files,
  HardDrive,
  Clock,
  Sparkles,
  History,
  Download,
  Eye,
  TrendingUp,
  Library,
  FolderOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { PremiumPack } from "@/lib/premium-packs/types";
import { formatBytes, formatRelative } from "@/lib/premium-packs/format";
import { useLocalFavorites } from "@/hooks/useLocalFavorites";
import { listPremiumPacks } from "@/lib/premium-packs/packs.functions";
import { PackShareDialog } from "./PackShareDialog";
import { PackCover } from "./PackCover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(n ?? 0);
}

export function PackDetailPage({ pack }: { pack: PremiumPack }) {
  const router = useRouter();
  const { isFav, toggle } = useLocalFavorites("premium_pack");
  const favored = isFav(pack.id);

  const listFn = useServerFn(listPremiumPacks);
  const { data: relatedData } = useQuery({
    queryKey: ["premium-packs", "related", pack.categoria ?? "_"],
    queryFn: () =>
      listFn({
        data: { categoria: pack.categoria ?? undefined, limit: 8, offset: 0, sort: "populares" },
      }),
    staleTime: 60_000,
  });
  const related = useMemo(
    () => (relatedData?.rows ?? []).filter((p) => p.id !== pack.id).slice(0, 3),
    [relatedData, pack.id],
  );

  const shareUrl = useMemo(() => {
    const token = (pack as PremiumPack & { public_token?: string | null }).public_token;
    const path = token ? `/p/${pack.slug}-${token}` : `/packs/${pack.slug}`;
    return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  }, [pack]);

  const [shareOpen, setShareOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Body scroll lock enquanto o viewer (modal customizado) estiver aberto.
  // Radix Dialog/Sheet/Drawer já lidam com isso sozinhos — este é o único
  // overlay do app que não usa a primitive Radix.
  useEffect(() => {
    if (!viewerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewerOpen]);

  const driveUrl = (pack as PremiumPack & { drive_url?: string | null }).drive_url ?? null;
  const archiveUrl = (pack as PremiumPack & { archive_url?: string | null }).archive_url ?? null;

  const driveEmbedUrl = useMemo(() => {
    if (!driveUrl) return null;
    const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
    const fileMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    const openMatch = driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
    return driveUrl;
  }, [driveUrl]);

  const handleDownload = async () => {
    if (!archiveUrl) return;
    try {
      const res = await fetch(archiveUrl);
      if (!res.ok) throw new Error("Não foi possível baixar o arquivo");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      const fname = decodeURIComponent(
        archiveUrl.split("?")[0].split("/").pop() ?? `${pack.slug}.zip`,
      );
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
      toast.success("Download iniciado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no download");
    }
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else router.navigate({ to: "/packs" });
  };

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: pack.nome,
          text: pack.descricao_curta ?? "Confira este pack premium",
          url: shareUrl,
        });
        return;
      }
    } catch {
      /* cancel */
    }
    setShareOpen(true);
  };

  const handleFavorite = () => {
    toggle(pack.id);
    toast.success(favored ? "Removido dos favoritos" : "Adicionado aos favoritos");
  };

  const version = pack.versao || "1.0";

  const novidades = useMemo(() => {
    const list: { titulo: string; data: string; nota?: string }[] = [];
    if (pack.ultima_atualizacao) {
      list.push({
        titulo: `Atualização v${version}`,
        data: pack.ultima_atualizacao,
        nota: "Novos arquivos, capas atualizadas e revisão geral do conteúdo.",
      });
    }
    if (pack.updated_at && pack.updated_at !== pack.ultima_atualizacao) {
      list.push({
        titulo: "Revisão de catálogo",
        data: pack.updated_at,
        nota: "Reorganização e melhorias de navegação.",
      });
    }
    if (pack.created_at) {
      list.push({ titulo: "Pack publicado", data: pack.created_at, nota: "Lançamento oficial." });
    }
    return list;
  }, [pack.ultima_atualizacao, pack.updated_at, pack.created_at, version]);

  return (
    <div
      data-ai-theme="packs"
      className="ai-module relative min-h-screen overflow-hidden bg-black text-white animate-fade-in"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--ai-500)_0%,transparent_55%)] opacity-[0.12]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[34rem] w-[34rem] rounded-full bg-ai-500/[0.08] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-ai-400/[0.06] blur-[120px]" />
      </div>

      {/* HERO */}
      <section className="relative w-full">
        <div className="relative h-[44vh] min-h-[320px] max-h-[560px] w-full overflow-hidden">
          <PackCover
            src={pack.banner_url || pack.capa_url}
            title={pack.nome}
            variant="banner"
            rounded="rounded-none"
            priority
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
          <div className="absolute inset-x-0 top-0 p-4 sm:p-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full border border-ai-300/25 bg-black/55 px-3.5 py-1.5 text-xs font-medium text-ai-100/90 backdrop-blur-md hover:border-ai-300/60 hover:text-ai-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
          </div>
        </div>

        <div className="relative -mt-44 sm:-mt-56">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
              <div className="hidden sm:block">
                <div className="relative h-48 w-36 overflow-hidden rounded-2xl border border-ai-300/30 bg-black shadow-[0_30px_80px_-25px_var(--ai-500)]">
                  <PackCover
                    src={pack.capa_url}
                    title={pack.nome}
                    variant="card"
                    rounded="rounded-none"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ai-300/40 bg-gradient-to-r from-ai-500/15 to-ai-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-ai-100 backdrop-blur-md">
                    <Sparkles className="h-3 w-3" /> {pack.categoria || "Premium"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-white/70 backdrop-blur-md">
                    v{version}
                  </span>
                </div>
                <h1 className="mt-3 bg-gradient-to-r from-ai-50 via-ai-200 to-ai-300 bg-clip-text text-3xl sm:text-5xl font-bold tracking-tight text-transparent">
                  {pack.nome}
                </h1>
                {pack.descricao_curta && (
                  <p className="mt-3 max-w-2xl text-sm sm:text-base text-white/70">
                    {pack.descricao_curta}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {driveEmbedUrl && pack.allow_view && (
                    <button
                      type="button"
                      onClick={() => setViewerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ai-300/60 bg-gradient-to-r from-ai-500/30 to-ai-400/20 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-ai-50 transition hover:shadow-[0_0_28px_-6px_var(--ai-500)]"
                    >
                      <FolderOpen className="h-3.5 w-3.5" /> Abrir conteúdo
                    </button>
                  )}
                  {archiveUrl && pack.allow_download && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ai-300/40 bg-gradient-to-r from-ai-500/20 to-ai-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-ai-50 transition hover:border-ai-300/70 hover:shadow-[0_0_24px_-8px_var(--ai-500)]"
                    >
                      <Download className="h-3.5 w-3.5" /> Baixar arquivo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ai-300/40 bg-gradient-to-r from-ai-500/20 to-ai-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-ai-50 transition hover:border-ai-300/70 hover:shadow-[0_0_24px_-8px_var(--ai-500)]"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Compartilhar
                  </button>
                  <button
                    type="button"
                    onClick={handleFavorite}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition",
                      favored
                        ? "border-ai-300/60 bg-ai-500/15 text-ai-50"
                        : "border-white/15 bg-white/[0.04] text-white/80 hover:border-ai-300/40 hover:text-ai-50",
                    )}
                  >
                    <Heart className={cn("h-3.5 w-3.5", favored && "fill-current")} />{" "}
                    {favored ? "Favoritado" : "Favoritar"}
                  </button>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={Files} label="Arquivos" value={fmt(pack.qtd_arquivos)} />
              <KpiCard icon={HardDrive} label="Espaço" value={formatBytes(pack.espaco_bytes)} />
              <KpiCard icon={Download} label="Downloads" value={fmt(pack.downloads)} />
              <KpiCard icon={Eye} label="Visualizações" value={fmt(pack.views)} />
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <Tabs defaultValue="sobre">
          <TabsList className="border border-ai-300/15 bg-black/40">
            <TabsTrigger value="sobre">Sobre</TabsTrigger>
            <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="sobre" className="mt-6 space-y-6">
            {pack.descricao_completa ? (
              <div className="rounded-2xl border border-ai-300/15 bg-black/40 p-6">
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-white/80">
                  {pack.descricao_completa}
                </div>
              </div>
            ) : (
              <EmptyBox icon={Sparkles} title="Sem descrição detalhada">
                Este pack ainda não possui descrição completa. Compartilhe para receber acesso à
                comunidade.
              </EmptyBox>
            )}

            {(pack.tags?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-ai-300/15 bg-black/40 p-6">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-ai-200/80">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {pack.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetaRow label="Autor" value={pack.autor ?? "—"} />
              <MetaRow label="Popularidade" value={fmt(pack.popularidade)} icon={TrendingUp} />
              <MetaRow
                label="Última atualização"
                value={formatRelative(pack.ultima_atualizacao)}
                icon={Clock}
              />
            </div>
          </TabsContent>

          <TabsContent value="biblioteca" className="mt-6">
            <EmptyBox icon={Library} title="Biblioteca em preparação">
              A visualização de pastas e arquivos (com download seguro) será liberada assim que as
              integrações externas (Google Drive / R2 / Storage) forem configuradas.
            </EmptyBox>
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <div className="rounded-2xl border border-ai-300/15 bg-black/40 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <History className="h-4 w-4 text-ai-200" /> Linha do tempo
              </h3>
              {novidades.length === 0 ? (
                <p className="text-sm text-white/55">Sem histórico registrado.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-ai-300/20 pl-5">
                  {novidades.map((n, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full border border-ai-300/40 bg-ai-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-ai-200" />
                      </span>
                      <div className="text-sm font-semibold text-white">{n.titulo}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        {formatRelative(n.data)}
                      </div>
                      {n.nota && <p className="mt-1 text-xs text-white/60">{n.nota}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="mb-4 text-[11px] uppercase tracking-[0.32em] text-ai-200 font-bold">
              Você também pode gostar
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => router.navigate({ to: "/packs/$slug", params: { slug: r.slug } })}
                  className="group text-left rounded-2xl overflow-hidden border border-ai-300/15 bg-black/40 hover:border-ai-300/40 transition"
                >
                  <div className="aspect-[3/4] relative bg-black">
                    <PackCover
                      src={r.capa_url}
                      title={r.nome}
                      variant="card"
                      rounded="rounded-none"
                    />
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-ai-200/70 font-bold">
                      {r.categoria || "Pack"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white line-clamp-2">
                      {r.nome}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <PackShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        pack={{
          id: pack.id,
          slug: pack.slug,
          nome: pack.nome,
          descricao_curta: pack.descricao_curta,
          capa_url: pack.capa_url,
          is_shareable: pack.is_shareable,
        }}
        baseUrl={shareUrl}
      />

      {viewerOpen && driveEmbedUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overscroll-contain bg-black/85 p-3 sm:p-6 backdrop-blur-sm animate-fade-in"
          onClick={() => setViewerOpen(false)}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div
            className="relative flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-ai-300/30 bg-black shadow-[0_40px_120px_-20px_var(--ai-500)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-4 w-4 text-ai-200 shrink-0" />
                <span className="truncate text-xs font-semibold uppercase tracking-[0.24em] text-ai-100">
                  {pack.nome}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {archiveUrl && pack.allow_download && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-ai-300/40 bg-ai-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ai-50 hover:bg-ai-500/20"
                  >
                    <Download className="h-3 w-3" /> Baixar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewerOpen(false)}
                  className="grid size-7 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10"
                  aria-label="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <iframe
              src={driveEmbedUrl}
              title={`Conteúdo do pack ${pack.nome}`}
              className="flex-1 w-full bg-white"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-ai-300/15 bg-black/40 px-3 py-2.5 backdrop-blur">
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

function MetaRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-ai-300/15 bg-black/40 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-white">
        {Icon && <Icon className="h-3.5 w-3.5 text-ai-200/80" />}
        {value}
      </div>
    </div>
  );
}

function EmptyBox({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ai-300/20 bg-gradient-to-br from-ai-500/[0.05] via-black/40 to-ai-400/[0.03] p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-ai-500/30 to-ai-400/20 shadow-[0_0_30px_-8px_var(--ai-500)]">
        <Icon className="h-7 w-7 text-ai-100" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
      <p className="mx-auto max-w-md text-sm text-white/55">{children}</p>
    </div>
  );
}
