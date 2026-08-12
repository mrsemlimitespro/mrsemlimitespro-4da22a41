import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  CheckCircle2,
  Package,
  Upload,
  Video,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Clock,
  Monitor,
  KeyRound,
  Sparkles,
  CalendarClock,
  Radio,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { playSfx } from "@/lib/sfx";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import currentExtensionAsset from "@/assets/MR-Sem-Limites-v17.zip.asset.json";

export const Route = createFileRoute("/_app/baixar-extensao")({
  head: () => ({
    meta: [
      { title: "Baixar Extensão Atual — MR Sem Limites" },
      { name: "description", content: "Baixe a versão atualizada da extensão MR Sem Limites." },
    ],
  }),
  component: BaixarExtensaoPage,
});

type ExtensionRelease = {
  version: string;
  date: string;
  filename: string;
  downloadPath: string;
  size: string;
  latest?: boolean;
  changelog: string[];
};

const RELEASES: ExtensionRelease[] = [
  {
    version: "2.3.3 (v21.2 - Rebuild)",
    date: "05/08/2026",
    filename: "mr-sem-limites-v21-final.zip",
    downloadPath: currentExtensionAsset.url,
    size: "690 KB",
    latest: true,
    changelog: [
      "Hotfix Crítico: Corrigido erro de sintaxe nos nomes de funções internas que impedia a extensão de inicializar.",
      "Forçar Abertura: Injetado comando para obrigar o Painel Lateral a abrir imediatamente ao clicar no ícone da extensão.",
      "Visual: Refinamento do Azul Neon (#00f2ff) nas bordas com brilho aprimorado.",
      "Limpeza: Removido definitivamente qualquer rastro de branding antigo.",
    ],
  },
  {
    version: "2.3.2 (v21.1)",
    date: "05/08/2026",
    filename: "mr-sem-limites-v21-final.zip",
    downloadPath: currentExtensionAsset.url,
    size: "688 KB",
    changelog: [
      "Visual: Bordas e brilho Azul Neon.",
      "Branding: Remoção completa de termos antigos.",
    ],
  },
];

const VIDEO_BUCKET = "extension-releases";
const VIDEO_FILENAME = "mr-sem-limites-2.2.8-video.zip";

function BaixarExtensaoPage() {
  const role = useUserRole();
  const canSeeVideo = role === "admin" || role === "revendedor";
  const isAdmin = role === "admin";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 md:pt-12">
      <header className="mb-8">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Extensão
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">Baixar Extensão</h1>
        <p className="mt-2 text-muted-foreground">
          Somente a versão atualizada fica disponível para evitar instalar arquivo antigo.
        </p>
      </header>

      <InstallSteps />

      <div className="mt-6">
        <ExtensionStatusStrip />
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {RELEASES.map((r) => (
          <ReleaseCard key={r.version} release={r} />
        ))}

        {canSeeVideo && <VideoReleaseCard isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function InstallSteps() {
  return (
    <Card className="glass border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Como instalar</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Baixe o arquivo <code className="rounded bg-muted/60 px-1">.zip</code> da versão mais recente.</li>
          <li>Descompacte em uma pasta no seu computador.</li>
          <li>Abra <code className="rounded bg-muted/60 px-1">chrome://extensions</code> no navegador.</li>
          <li>Ative o <strong>Modo desenvolvedor</strong> (canto superior direito).</li>
          <li>Clique em <strong>Carregar sem compactação</strong> e selecione a pasta descompactada.</li>
        </ol>
        <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200/80 border border-amber-500/20">
          <strong>Atenção:</strong> Se a extensão não abrir ou der erro ao carregar, verifique se você selecionou a <strong>pasta raiz</strong> (que contém o arquivo manifest.json) e não uma pasta vazia ou o arquivo .zip diretamente.
        </div>
      </CardContent>
    </Card>
  );
}

function ReleaseCard({ release }: { release: ExtensionRelease }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      playSfx("swipe");
      const res = await fetch(release.downloadPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`Falha ao baixar (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = release.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success(`Download iniciado — ${release.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao baixar");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="glass border-border/60 overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="grid size-10 place-items-center rounded-xl gradient-primary">
              <Package className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Versão {release.version}</h2>
                {release.latest && (
                  <Badge className="gradient-primary text-primary-foreground border-0">
                    Mais recente
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {release.date} · {release.filename} · {release.size}
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5">
            {release.changelog.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            size="lg"
            className="w-full md:w-auto"
          >
            <Download className="mr-2 size-4" />
            {downloading ? "Baixando..." : "Baixar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function VideoReleaseCard({ isAdmin }: { isAdmin: boolean }) {
  const [checking, setChecking] = useState(true);
  const [exists, setExists] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    const { data, error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .list("", { limit: 20, search: VIDEO_FILENAME });
    if (error) {
      setChecking(false);
      return;
    }
    const found = (data ?? []).find((f) => f.name === VIDEO_FILENAME);
    if (found) {
      setExists(true);
      const meta = found.metadata as { size?: number } | null;
      setSize(meta?.size ?? null);
      setUpdatedAt(found.updated_at ?? found.created_at ?? null);
    } else {
      setExists(false);
      setSize(null);
      setUpdatedAt(null);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      playSfx("swipe");
      const { data, error } = await supabase.storage
        .from(VIDEO_BUCKET)
        .createSignedUrl(VIDEO_FILENAME, 120, { download: VIDEO_FILENAME });
      if (error || !data?.signedUrl) throw new Error(error?.message ?? "Sem URL");
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = VIDEO_FILENAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Download iniciado — ${VIDEO_FILENAME}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao baixar");
    } finally {
      setDownloading(false);
    }
  };

  const handlePickFile = () => inputRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Envie um arquivo .zip");
      return;
    }
    try {
      setUploading(true);
      const { error } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(VIDEO_FILENAME, file, {
          contentType: "application/zip",
          cacheControl: "no-store",
          upsert: true,
        });
      if (error) throw error;
      toast.success("Extensão vídeo enviada");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="glass border-border/60 overflow-hidden relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="grid size-10 place-items-center rounded-xl gradient-warm">
              <Video className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">Versão 2.2.8 · Vídeo</h2>
                <Badge className="gradient-warm text-primary-foreground border-0">
                  Ultra completa
                </Badge>
                <Badge variant="outline" className="border-fuchsia-400/40 text-fuchsia-300">
                  Somente revendedor
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {VIDEO_FILENAME}
                {exists && size ? ` · ${formatSize(size)}` : ""}
                {exists && updatedAt
                  ? ` · atualizado ${new Date(updatedAt).toLocaleString("pt-BR")}`
                  : ""}
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
              <span>Extensão Ultra completa: envio com <strong>vídeo</strong> e <strong>imagem</strong> como anexos.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
              <span>Distribuição restrita: aparece apenas para revendedores e administradores.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
              <span>Baseada na 2.2.7 — mesma estrutura, mesmas licenças, mesmos endpoints.</span>
            </li>
            {!exists && !checking && (
              <li className="flex items-start gap-2 text-fuchsia-300">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>Aguardando envio do arquivo pelo administrador.</span>
              </li>
            )}
          </ul>
        </div>

        <div className="shrink-0 flex flex-col gap-2 md:min-w-[180px]">
          {isAdmin && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                onClick={handlePickFile}
                disabled={uploading}
                size="lg"
                variant="outline"
                className="w-full border-fuchsia-400/50 hover:bg-fuchsia-500/10"
              >
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                {uploading ? "Enviando..." : exists ? "Substituir" : "Enviar .zip"}
              </Button>
            </>
          )}
          <Button
            onClick={handleDownload}
            disabled={downloading || checking || !exists}
            size="lg"
            className="w-full gradient-warm text-primary-foreground border-0"
          >
            {downloading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            {checking
              ? "Verificando..."
              : !exists
                ? "Indisponível"
                : downloading
                  ? "Baixando..."
                  : "Baixar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// Status strip da extensão instalada — mostra chips arrastáveis
// com estado ativo/uso/expiração/dispositivos por licença do usuário.
// =====================================================================

type LicencaResumo = {
  id: string;
  chave: string;
  status: string;
  tipo: string;
  expira_em: string | null;
  ultimo_acesso: string | null;
  device_id: string | null;
  max_dispositivos: number | null;
  dispositivos: number;
};

function ExtensionStatusStrip() {
  const [loading, setLoading] = useState(true);
  const [licencas, setLicencas] = useState<LicencaResumo[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ down: boolean; startX: number; startScroll: number; moved: boolean }>({
    down: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        setLicencas([]);
        return;
      }
      // Busca licenças ligadas ao email do usuário logado.
      const { data } = await (supabase as any)
        .from("licencas")
        .select(
          "id, chave, status, tipo, expira_em, ultimo_acesso, device_id, max_dispositivos, email, cliente_id",
        )
        .or(`email.eq.${user.email},cliente_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(6);

      const rows = (data ?? []) as any[];
      const ids = rows.map((r) => r.id);
      let devMap: Record<string, number> = {};
      if (ids.length) {
        const { data: devs } = await (supabase as any)
          .from("licenca_dispositivos")
          .select("licenca_id")
          .in("licenca_id", ids);
        for (const d of devs ?? []) {
          devMap[d.licenca_id] = (devMap[d.licenca_id] ?? 0) + 1;
        }
      }
      setLicencas(
        rows.map((r) => ({
          id: r.id,
          chave: r.chave,
          status: r.status,
          tipo: r.tipo,
          expira_em: r.expira_em,
          ultimo_acesso: r.ultimo_acesso,
          device_id: r.device_id,
          max_dispositivos: r.max_dispositivos,
          dispositivos: devMap[r.id] ?? 0,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Atualiza contadores de tempo a cada 30s para não travar.
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  void tick;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = {
      down: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    if (!s.down) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    el.scrollLeft = s.startScroll - dx;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current.down = false;
    try {
      scrollerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-40 shrink-0 animate-pulse rounded-2xl bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (!licencas.length) {
    return (
      <Card className="glass border-border/60">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <ShieldAlert className="size-4 text-amber-400" />
          Nenhuma licença ativa vinculada a este usuário ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Status da extensão
        </div>
        <div className="text-[11px] text-muted-foreground/70">
          Arraste para ver mais →
        </div>
      </div>

      {licencas.map((lic) => (
        <LicencaChipsRow
          key={lic.id}
          licenca={lic}
          scrollerRef={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ))}
    </div>
  );
}

function LicencaChipsRow({
  licenca,
  scrollerRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  licenca: LicencaResumo;
  scrollerRef: React.MutableRefObject<HTMLDivElement | null>;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const expirou =
    licenca.expira_em !== null && new Date(licenca.expira_em).getTime() < Date.now();
  const ativa =
    (licenca.status === "ativa" || licenca.status === "aguardando") && !expirou;

  const ultimoAcessoMs = licenca.ultimo_acesso
    ? Date.now() - new Date(licenca.ultimo_acesso).getTime()
    : null;
  const emUso = ultimoAcessoMs !== null && ultimoAcessoMs < 5 * 60_000;

  const chips: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: "ok" | "warn" | "bad" | "info";
  }> = [];

  // Status
  chips.push({
    key: "status",
    icon: ativa ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />,
    label: "Extensão",
    value: ativa ? "Ativa" : expirou ? "Expirada" : "Inativa",
    tone: ativa ? "ok" : "bad",
  });

  // Em uso
  chips.push({
    key: "uso",
    icon: emUso ? <Radio className="size-4" /> : <Activity className="size-4" />,
    label: "Uso agora",
    value: emUso
      ? "Em uso"
      : ultimoAcessoMs !== null
        ? `${formatRelativeShort(ultimoAcessoMs)} atrás`
        : "Sem acesso",
    tone: emUso ? "ok" : "info",
  });

  // Tempo até vencer
  if (licenca.expira_em) {
    const restMs = new Date(licenca.expira_em).getTime() - Date.now();
    const restStr = restMs > 0 ? formatRelativeShort(restMs) : "Venceu";
    const tone: "ok" | "warn" | "bad" =
      restMs <= 0
        ? "bad"
        : restMs < 24 * 3600_000
          ? "warn"
          : restMs < 7 * 86400_000
            ? "warn"
            : "ok";
    chips.push({
      key: "expira",
      icon: <Clock className="size-4" />,
      label: "Vence em",
      value: restStr,
      tone,
    });
  } else {
    chips.push({
      key: "expira",
      icon: <Sparkles className="size-4" />,
      label: "Validade",
      value: "Vitalícia",
      tone: "ok",
    });
  }

  // Tipo / plano
  chips.push({
    key: "tipo",
    icon: <Sparkles className="size-4" />,
    label: "Plano",
    value: licenca.tipo === "teste" ? "Teste" : "Premium",
    tone: licenca.tipo === "teste" ? "warn" : "ok",
  });

  // Dispositivos
  chips.push({
    key: "dev",
    icon: <Monitor className="size-4" />,
    label: "Dispositivos",
    value: `${licenca.dispositivos}/${licenca.max_dispositivos ?? 1}`,
    tone:
      licenca.max_dispositivos && licenca.dispositivos > licenca.max_dispositivos
        ? "bad"
        : "info",
  });

  // Último acesso data
  if (licenca.ultimo_acesso) {
    chips.push({
      key: "ult",
      icon: <CalendarClock className="size-4" />,
      label: "Último acesso",
      value: new Date(licenca.ultimo_acesso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      tone: "info",
    });
  }

  // Chave mascarada
  chips.push({
    key: "chave",
    icon: <KeyRound className="size-4" />,
    label: "Licença",
    value: maskKey(licenca.chave),
    tone: "info",
  });

  return (
    <div className="relative mb-3">
      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2",
          "[scrollbar-width:thin] cursor-grab active:cursor-grabbing select-none",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {chips.map((c) => (
          <StatusChip icon={c.icon} label={c.label} value={c.value} tone={c.tone} key={c.key} />
        ))}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

function StatusChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad" | "info";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-400/30 text-emerald-200 bg-emerald-500/10"
      : tone === "warn"
        ? "border-amber-400/30 text-amber-200 bg-amber-500/10"
        : tone === "bad"
          ? "border-rose-400/30 text-rose-200 bg-rose-500/10"
          : "border-border/60 text-foreground/80 bg-muted/20";

  return (
    <div
      className={cn(
        "glass shrink-0 snap-start rounded-2xl border px-3 py-2",
        "min-w-[148px] flex items-center gap-2.5",
        toneClass,
      )}
    >
      <div className="grid size-8 place-items-center rounded-xl bg-background/40">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          {label}
        </div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function maskKey(key: string): string {
  if (!key) return "—";
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function formatRelativeShort(ms: number): string {
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}min`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ${h % 24}h`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mês${mo > 1 ? "es" : ""}`;
  const y = Math.floor(d / 365);
  return `${y}ano${y > 1 ? "s" : ""}`;
}
